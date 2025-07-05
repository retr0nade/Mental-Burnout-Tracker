import AnalyticsEngine from './analytics.js';
import StateManager from './state-manager.js';
import InterventionManager from './intervention-manager.js';

class Worker {
  constructor() {
    this.state = new StateManager();
    this.analytics = new AnalyticsEngine(this.state);
    this.interventions = new InterventionManager();

    this.popupOpen = false;
    this.activePorts = new Set();
    this.lastIntervention = null;
  }

  initialize() {
    this.setupListeners();
    this.state.initializeStorage()
      .then(() => this.analytics.initialize())
      .then(() => this.checkBurnoutThresholds())
      .catch(err => console.error('[worker] Initialization failed:', err));
  }

  setupListeners() {
    const debouncedCheck = this.debounce(this.checkBurnoutThresholds.bind(this), 1000);

    chrome.tabs.onCreated.addListener(async tab => {
      if (!(await this.isTrackingEnabled())) return;
      this.analytics.recordTabCreation(tab);
      debouncedCheck();
    });

    chrome.tabs.onActivated.addListener(async info => {
      if (!(await this.isTrackingEnabled())) return;
      this.analytics.recordTabSwitch(info);
      debouncedCheck();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true;
    });

    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup') {
        console.log('[worker] Popup connected');
        this.popupOpen = true;
        this.activePorts.add(port);

        port.onDisconnect.addListener(() => {
          console.log('[worker] Popup disconnected');
          this.activePorts.delete(port);
          if (this.activePorts.size === 0) this.popupOpen = false;
        });

        port.postMessage({ type: 'ack', message: 'Connected to background' });
      }

      else if (port.name === 'youtube_port') {
        console.log('[worker] YouTube content script connected');
        port.onMessage.addListener(async (msg) => {
          if (msg.type === 'youtube_activity') {
            if (!(await this.isTrackingEnabled())) return;
            console.log('[worker] YouTube activity:', msg.data);
            this.analytics.processYoutubeActivity(msg.data);
            await this.checkBurnoutThresholds();
          }
        });

        port.onDisconnect.addListener(() => {
          console.log('[worker] YouTube port disconnected');
        });
      }
    });
  }

  async isTrackingEnabled() {
    const { trackingEnabled } = await chrome.storage.local.get('trackingEnabled');
    return trackingEnabled !== false; // default to true
  }

  debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  async handleMessage(request) {
    switch (request.type) {
      case 'get_burnout_data':
        return this.getCurrentData();

      case 'refresh_data':
        return await this.checkBurnoutThresholds();

      case 'youtube_activity': // fallback for older scripts
        if (!(await this.isTrackingEnabled())) return { status: 'ignored' };
        console.log('[worker] Received YouTube activity (fallback):', request.data);
        this.analytics.processYoutubeActivity(request.data);
        await this.checkBurnoutThresholds();
        return { status: 'processed' };

      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  async getCurrentData() {
    try {
      const currentScore = this.analytics.getCurrentScore();
      const metrics = this.analytics.getCurrentMetrics();
      const burnoutState = await this.state.getCurrentState();

      const trendData = burnoutState.trendData || {};
      const weeklyTrend = this.formatTrendData(trendData);

      return {
        currentScore,
        metrics,
        weeklyTrend,
        lastUpdated: new Date().toISOString(),
        status: 'success'
      };
    } catch (error) {
      console.error('[worker] Data generation failed:', error);
      return {
        status: 'error',
        error: 'Could not generate analytics data'
      };
    }
  }

  formatTrendData(trendData) {
    const labels = [];
    const values = [];

    const sorted = Object.entries(trendData).sort(([a], [b]) => a.localeCompare(b));
    const latest = sorted.slice(-12); // last 12 time points

    for (const [hour, { score }] of latest) {
      const label = hour.split('T')[1];
      labels.push(`${label}:00`);
      values.push(parseFloat(score));
    }

    return { labels, values };
  }

  async checkBurnoutThresholds() {
    if (!(await this.isTrackingEnabled())) {
      console.log('[worker] Skipping burnout check - tracking is disabled.');
      return { success: false, error: 'Tracking disabled' };
    }

    try {
      const score = await this.analytics.calculateBurnoutScore();
      const metrics = this.analytics.getCurrentMetrics();

      await this.state.saveSessionData({
        timestamp: Date.now(),
        score,
        metrics
      });

      if (this.popupOpen) {
        const data = await this.getCurrentData();
        this.broadcastToPorts({ type: 'burnout_update', data });
      }

      const now = Date.now();
      const shouldIntervene =
        (score > 7.5 && (!this.lastIntervention || now - this.lastIntervention > 5 * 60 * 1000)) ||
        (score > 5 && (!this.lastIntervention || now - this.lastIntervention > 3 * 60 * 1000));

      if (shouldIntervene) {
        const level = score > 7.5 ? 'severe' : 'moderate';
        this.interventions.showIntervention(level);
        this.lastIntervention = now;
      }

      return { success: true, score, metrics };
    } catch (error) {
      console.error('[worker] Burnout check failed:', error);
      return { success: false, error: error.message };
    }
  }

  broadcastToPorts(message) {
    for (const port of this.activePorts) {
      try {
        port.postMessage(message);
      } catch (err) {
        console.warn('[worker] Failed to send to port:', err);
      }
    }
  }
}

try {
  const worker = new Worker();
  worker.initialize();
} catch (error) {
  console.error('[worker] Worker initialization failed:', error);
}
