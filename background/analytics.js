export default class AnalyticsEngine {
  constructor(stateManager) {
    this.stateManager = stateManager; // NEW: for syncing with state
    this.metrics = {
      tabVelocity: [],
      attentionSpans: [],
      switches: [],
      youtube: {
        videosWatched: 0,
        timeSpent: 0,
        relatedBinges: 0
      }
    };

    this.lastTabSwitchTime = Date.now();
    this.lastCalculatedScore = null;
    this.cacheTimestamp = null;
    this.cacheDuration = 30000; // 30 seconds
  }

  async initialize() {
    await this._loadMetricsFromStorage();
    this._startCleanupInterval();
    this._startAutoSessionSave(); // NEW
    console.log('Analytics engine initialized');
  }

  async _loadMetricsFromStorage() {
    const { sessionMetrics } = await chrome.storage.local.get('sessionMetrics');
    if (sessionMetrics) {
      this.metrics = sessionMetrics;
      console.log('[Analytics] Metrics restored from storage');
    }
  }

  async _persistMetricsToStorage() {
    await chrome.storage.local.set({ sessionMetrics: this.metrics });
  }

  recordTabCreation(tab) {
    if (!tab || !tab.id) return;
    this.metrics.tabVelocity.push({ timestamp: Date.now(), tabId: tab.id });
    this._invalidateCache();
    this._persistMetricsToStorage();
  }

  recordTabSwitch(activeInfo) {
    if (!activeInfo || !activeInfo.tabId) return;

    const now = Date.now();

    if (activeInfo.previousTabId && activeInfo.previousTabId !== activeInfo.tabId) {
      this.metrics.attentionSpans.push({
        startTime: this.lastTabSwitchTime,
        endTime: now,
        tabId: activeInfo.previousTabId
      });
    }

    this.metrics.switches.push({
      timestamp: now,
      from: activeInfo.previousTabId || null,
      to: activeInfo.tabId
    });

    this.lastTabSwitchTime = now;
    this._invalidateCache();
    this._persistMetricsToStorage();
  }

  processYoutubeActivity(data) {
    console.log('[Analytics] Processing YouTube time:', data);
    if (!data) return;
    this.metrics.youtube.videosWatched += data.videosWatched || 0;
    this.metrics.youtube.timeSpent += data.timeSpent || 0;
    if (data.isBinge) this.metrics.youtube.relatedBinges++;
    this._invalidateCache();
    this._persistMetricsToStorage();
  }

  async calculateBurnoutScore() {
    if (this.cacheTimestamp && Date.now() - this.cacheTimestamp < this.cacheDuration) {
      return this.lastCalculatedScore;
    }

    try {
      const velocityScore = this._calculateVelocityScore();
      const attentionScore = this._calculateAttentionScore();
      const youtubeScore = this._calculateYoutubeScore();

      const { settings } = await chrome.storage.local.get('settings');
      const sensitivityMultiplier = {
        gentle: 0.8,
        balanced: 1.0,
        aggressive: 1.2
      }[settings?.sensitivity || 'balanced'];

      const baseScore = velocityScore + attentionScore + youtubeScore;
      const adjustedScore = baseScore * sensitivityMultiplier;

      this.lastCalculatedScore = Math.min(10, adjustedScore).toFixed(1);
      this.cacheTimestamp = Date.now();

      return this.lastCalculatedScore;
    } catch (error) {
      console.error('Score calculation failed:', error);
      return 0;
    }
  }

  getCurrentScore() {
    return this.lastCalculatedScore || 0;
  }

  getCurrentMetrics() {
    return {
      tabVelocity: this._calculateHourlyTabRate(),
      avgAttentionSpan: this._calculateAverageAttentionSpan(),
      tabSwitches: this._getRecentSwitches(30),
      youtubeTime: Math.round(this.metrics.youtube.timeSpent / 60),
      lastUpdated: new Date().toISOString()
    };
  }

  _calculateVelocityScore() {
    const rate = this._calculateHourlyTabRate();
    if (rate >= 15) return 3;
    if (rate >= 10) return 2;
    if (rate >= 5) return 1;
    return 0;
  }

  _calculateAttentionScore() {
    const avg = this._calculateAverageAttentionSpan();
    if (avg < 2) return 3;
    if (avg < 5) return 2;
    return 1;
  }

  _calculateYoutubeScore() {
    const binge = this.metrics.youtube.relatedBinges * 0.5;
    const time = Math.min(3, this.metrics.youtube.timeSpent / 30);
    return Math.min(4, binge + time);
  }

  _calculateHourlyTabRate() {
    const oneHourAgo = Date.now() - 3600000;
    return this.metrics.tabVelocity.filter(t => t.timestamp >= oneHourAgo).length;
  }

  _calculateAverageAttentionSpan() {
    const recent = this.metrics.attentionSpans.filter(
      s => s.endTime >= Date.now() - 3600000
    );

    if (recent.length === 0) return 10;

    const total = recent.reduce((sum, s) => sum + (s.endTime - s.startTime) / 60000, 0);
    return total / recent.length;
  }

  _getRecentSwitches(mins) {
    const cutoff = Date.now() - mins * 60000;
    return this.metrics.switches.filter(s => s.timestamp >= cutoff).length;
  }

  _startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const oneDayAgo = Date.now() - 86400000;
      this.metrics.tabVelocity = this.metrics.tabVelocity.filter(t => t.timestamp >= oneDayAgo);
      this.metrics.switches = this.metrics.switches.filter(s => s.timestamp >= oneDayAgo);
      this.metrics.attentionSpans = this.metrics.attentionSpans.filter(a => a.endTime >= oneDayAgo);
      this._persistMetricsToStorage();
    }, 3600000); // hourly
  }

  _startAutoSessionSave() {
    setInterval(async () => {
      const score = await this.calculateBurnoutScore();
      if (this.stateManager) {
        await this.stateManager.saveSessionData({
          timestamp: Date.now(),
          score,
          metrics: this.getCurrentMetrics()
        });
      }
    }, 3600000); // Every hour
  }

  _invalidateCache() {
    this.lastCalculatedScore = null;
    this.cacheTimestamp = null;
  }

  getMetricsSnapshot() {
    return this.metrics;
  }

  getDebugState() {
    return {
      metrics: this.metrics,
      lastScore: this.lastCalculatedScore,
      cacheAge: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null
    };
  }
}
