// ui/popup/dashboard.js
import { renderGauge, renderTrendChart } from './charts.js';

export default class Dashboard {
  constructor() {
    this.initialized = false;
    this.loadAttempts = 0;
    this.maxLoadAttempts = 3;
    this.pollingInterval = null;
    this.pollingDelay = 10000; // fallback every 10 seconds

    this.initElements();
    this.setupEventListeners();
    this.initCharts();
    this.setupConnection();
    this.loadInitialData();
    this.setInitialState();
    this.loadTrackingPreference();
  }

  setInitialState() {
    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.dashboardContent.style.display = 'none';
    this.elements.errorState.style.display = 'none';

    this.loadingTimeout = setTimeout(() => {
      const loadingText = this.elements.loadingIndicator.querySelector('.loading-text');
      if (loadingText) loadingText.textContent = 'Taking longer than expected...';
      this.elements.retryBtn.style.display = 'block';
    }, 3000);
  }

  initElements() {
    this.elements = {
      // Metrics
      gauge: document.getElementById('burnoutGauge'),
      gaugeLabel: document.getElementById('gaugeLabel'),
      trendChart: document.getElementById('trendChart'),
      statusIndicator: document.getElementById('statusIndicator'),
      tabVelocity: document.getElementById('tabVelocity'),
      attentionSpan: document.getElementById('attentionSpan'),
      switches: document.getElementById('switches'),
      youtubeTime: document.getElementById('youtubeTime'),
      suggestions: document.getElementById('suggestions'),

      // States
      loadingIndicator: document.getElementById('loadingIndicator'),
      dashboardContent: document.getElementById('dashboardContent'),
      errorState: document.getElementById('errorState'),
      errorMessage: document.getElementById('errorMessage'),

      // Buttons
      retryBtn: document.getElementById('retryBtn'),
      reloadBtn: document.getElementById('reloadBtn'),
      meditateBtn: document.getElementById('meditateBtn'),
      breakBtn: document.getElementById('breakBtn'),

      // Toggle
      trackingToggle: document.getElementById('trackingToggle')
    };
  }

  setupEventListeners() {
    this.elements.retryBtn.addEventListener('click', () => this.retryLoad());
    this.elements.reloadBtn.addEventListener('click', () => window.location.reload());

    this.elements.meditateBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.mindful.org/5-minute-meditation/' });
    });

    this.elements.breakBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'start_break', duration: 5 });
    });

    this.elements.trackingToggle?.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await chrome.storage.local.set({ trackingEnabled: enabled });
      console.log('[dashboard] Tracking is now', enabled ? 'ON' : 'OFF');

      const label = document.getElementById('trackingStatusLabel');
      if (label) label.textContent = `Tracking: ${enabled ? 'ON' : 'OFF'}`;
    });
  }

  async loadTrackingPreference() {
    const { trackingEnabled } = await chrome.storage.local.get('trackingEnabled');
    const enabled = trackingEnabled !== false;
    
    if (this.elements.trackingToggle) {
      this.elements.trackingToggle.checked = enabled;
    }

    const label = document.getElementById('trackingStatusLabel');
    if (label) label.textContent = `Tracking: ${enabled ? 'ON' : 'OFF'}`;
  }

  setupConnection() {
    try {
      this.port = chrome.runtime.connect({ name: 'popup' });

      this.port.onMessage.addListener(msg => this.handleMessage(msg));

      this.port.onDisconnect.addListener(() => {
        console.warn('[dashboard] Background connection lost');
        this.handleDisconnect();
      });
    } catch (error) {
      console.error('[dashboard] Connection failed:', error);
      this.showError('Failed to connect to extension');
    }
  }

  handleDisconnect() {
    if (!this.initialized) {
      this.showError('Extension not responding');
    } else {
      this.startPolling();
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'burnout_update':
        this.updateDashboard(message.data);
        break;
      case 'burnout_error':
        this.showError(message.error);
        break;
      case 'ack':
        console.log('[dashboard] Connected to background');
        break;
      default:
        console.log('[dashboard] Unhandled message:', message);
    }
  }

  async loadInitialData() {
    if (this.loadAttempts >= this.maxLoadAttempts) {
      this.showError('Too many failed attempts');
      return;
    }

    this.loadAttempts++;
    this.showLoading();

    try {
      const data = await Promise.race([
        chrome.runtime.sendMessage({ type: 'get_burnout_data' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
        )
      ]);

      if (!data) throw new Error('No data received');
      if (data.error) throw new Error(data.error);

      this.updateDashboard(data);
      this.showContent();
      this.initialized = true;
    } catch (error) {
      console.error('[dashboard] Data load failed:', error);
      this.showError(error.message);

      if (this.loadAttempts < this.maxLoadAttempts) {
        this.elements.retryBtn.style.display = 'block';
      }
    } finally {
      this.hideLoading();
    }
  }

  retryLoad() {
    this.elements.retryBtn.style.display = 'none';
    this.loadInitialData();
  }

  initCharts() {
    try {
      this.gaugeInstance = renderGauge(this.elements.gauge);
      this.trendInstance = renderTrendChart(this.elements.trendChart);
    } catch (error) {
      console.error('[dashboard] Chart initialization failed:', error);
      this.showError('Failed to initialize charts');
    }
  }

  updateDashboard(data) {
    if (!data) return;

    try {
      const score = data.currentScore ?? 0;

      this.gaugeInstance.data.datasets[0].data = [score, 10 - score];
      this.gaugeInstance.update();
      if (this.elements.gaugeLabel)
        this.elements.gaugeLabel.textContent = `${score}/10`;

      const statusClass =
        score > 7.5 ? 'danger' :
        score > 5 ? 'warning' : '';
      this.elements.statusIndicator.className = `status-indicator ${statusClass}`;

      const metrics = data.metrics ?? {};
      this.elements.tabVelocity.textContent = metrics.tabVelocity ?? '--';
      this.elements.attentionSpan.textContent = metrics.avgAttentionSpan ? `${Math.floor(metrics.avgAttentionSpan)}m` : '--';
      this.elements.switches.textContent = metrics.tabSwitches ?? '--';
      this.elements.youtubeTime.textContent = metrics.youtubeTime ? `${Math.floor(metrics.youtubeTime)}m` : '--';
      this.elements.gaugeLabel.textContent = `${score}/10`;

      this.elements.suggestions.innerHTML = this.getSuggestions(score);

      if (data.weeklyTrend) this.updateTrendChart(data.weeklyTrend);
    } catch (error) {
      console.error('[dashboard] updateDashboard() failed:', error);
    }
  }

  updateTrendChart(trendData) {
    try {
      this.trendInstance.data.labels = trendData.labels || [];
      this.trendInstance.data.datasets[0].data = trendData.values || [];
      this.trendInstance.update();
    } catch (err) {
      console.error('[dashboard] Failed to update trend chart:', err);
    }
  }

  getSuggestions(score) {
    if (score > 7.5) {
      return `
        <div class="suggestion-alert danger">
          <strong>🚨 High burnout detected</strong>
          <p>Take a 15-minute walk, rest your eyes, and hydrate.</p>
        </div>`;
    }

    if (score > 5) {
      return `
        <div class="suggestion-alert warning">
          <strong>⚠️ Moderate fatigue</strong>
          <p>Try 5-5-5: 5 breaths, 5 stretches, 5 min away from screen.</p>
        </div>`;
    }

    return `
      <div class="suggestion-alert">
        <strong>🌿 You’re in the green zone</strong>
        <p>Keep up the rhythm. Breaks every 45-60 minutes help.</p>
      </div>`;
  }

  showLoading() {
    this.elements.dashboardContent.style.display = 'none';
    this.elements.errorState.style.display = 'none';
    this.elements.loadingIndicator.style.display = 'flex';
  }

  hideLoading() {
    this.elements.loadingIndicator.style.display = 'none';
  }

  showContent() {
    this.elements.errorState.style.display = 'none';
    this.elements.loadingIndicator.style.display = 'none';
    this.elements.dashboardContent.style.display = 'block';
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.dashboardContent.style.display = 'none';
    this.elements.loadingIndicator.style.display = 'none';
    this.elements.errorState.style.display = 'block';
  }

  startPolling() {
    if (this.pollingInterval) return;
    console.log('[dashboard] Fallback polling started');
    this.pollingInterval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'get_burnout_data' }, response => {
        if (response && response.status === 'success') {
          this.updateDashboard(response);
        }
      });
    }, this.pollingDelay);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  cleanup() {
    this.stopPolling();
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    console.log('[dashboard] Cleanup complete');
  }
}

const dashboard = new Dashboard();
window.addEventListener('unload', () => dashboard.cleanup());
