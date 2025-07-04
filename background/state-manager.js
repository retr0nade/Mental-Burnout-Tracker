export default class StateManager {
  constructor() {
    this.cache = null;
    this.lastUpdated = 0;
    this.cacheTTL = 30000; // 30 seconds
  }

  async initializeStorage() {
    try {
      const data = await chrome.storage.local.get('burnoutData');
      if (!data.burnoutData) {
        const defaultData = {
          sessions: [],
          trendData: {}, // NEW: trend history by hour
          settings: {
            interventionsEnabled: true,
            notificationLevel: 'moderate',
            preferredActivities: ['meditation', 'stretching']
          },
          lastCalculated: null
        };
        await this._saveFullState(defaultData);
      }
      console.log('Storage initialized');
    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw error;
    }
  }

  async getCurrentState() {
    if (this.cache && Date.now() - this.lastUpdated < this.cacheTTL) {
      return this.cache;
    }

    try {
      const { burnoutData } = await chrome.storage.local.get('burnoutData');
      if (!burnoutData) throw new Error('No data available');

      this.cache = burnoutData;
      this.lastUpdated = Date.now();
      return burnoutData;
    } catch (error) {
      console.error('Failed to get state:', error);
      return this._getFallbackState();
    }
  }

  async saveSessionData({ timestamp, score, metrics }) {
    try {
      const state = await this.getCurrentState();
      const updatedSessions = [...state.sessions, { timestamp, score, metrics }].slice(-100);

      // === NEW: Update hourly trend ===
      const dt = new Date(timestamp);
      const hourKey = `${dt.getFullYear()}-${(dt.getMonth()+1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}T${dt.getHours().toString().padStart(2, '0')}`;
      const updatedTrend = { ...(state.trendData || {}) };
      updatedTrend[hourKey] = { score, timestamp };

      await this._saveFullState({
        ...state,
        sessions: updatedSessions,
        trendData: updatedTrend,
        lastCalculated: timestamp
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  async updateSettings(newSettings) {
    try {
      const state = await this.getCurrentState();
      await this._saveFullState({
        ...state,
        settings: {
          ...state.settings,
          ...newSettings
        }
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }

  async exportData() {
    const state = await this.getCurrentState();
    return {
      ...state,
      _exportedAt: new Date().toISOString()
    };
  }

  async resetData() {
    await this.initializeStorage();
    this.cache = null;
  }

  // --- Private ---
  async _saveFullState(newState) {
    try {
      await chrome.storage.local.set({ burnoutData: newState });
      this.cache = newState;
      this.lastUpdated = Date.now();
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  }

  _getFallbackState() {
    console.warn('Using fallback state');
    return {
      sessions: [],
      trendData: {},
      settings: {
        interventionsEnabled: true,
        notificationLevel: 'moderate',
        preferredActivities: ['meditation']
      },
      lastCalculated: null
    };
  }

  async _debugDump() {
    const data = await chrome.storage.local.get();
    console.log('Storage dump:', data);
    return data;
  }
}
