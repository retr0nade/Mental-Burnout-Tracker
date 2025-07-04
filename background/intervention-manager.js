// background/intervention-manager.js
export default class InterventionManager {
  constructor() {
    this.currentInterventions = new Map();
    this.setupListeners();
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'start_break') {
        this.startBreakTimer(request.duration);
      }
    });
  }

  showIntervention(level) {
    if (this.currentInterventions.has(level)) return;

    const interventionId = Date.now();
    this.currentInterventions.set(level, interventionId);

    if (level === 'severe') {
      chrome.windows.create({
        url: chrome.runtime.getURL('ui/notification.html?level=severe'),
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      });
    } else {
      chrome.notifications.create(`intervention-${interventionId}`, {
        type: 'basic',
        iconUrl: 'ui/assets/icons/icon128.png',
        title: 'Burnout Alert',
        message: 'Your activity suggests mental fatigue. Take a quick break?',
        buttons: [
          { title: 'Meditate' },
          { title: 'Nature Sounds' }
        ],
        priority: 2
      });
    }
  }

  startBreakTimer(minutes) {
    chrome.alarms.create('break_timer', {
      delayInMinutes: minutes
    });

    chrome.notifications.create('break_started', {
      type: 'progress',
      iconUrl: 'ui/assets/icons/icon128.png',
      title: 'Break Timer Started',
      message: `Taking a ${minutes}-minute break...`,
      progress: 0
    });

    // Update progress every minute
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed++;
      const progress = Math.min(100, (elapsed / minutes) * 100);
      chrome.notifications.update('break_started', { progress });
      
      if (elapsed >= minutes) {
        clearInterval(interval);
        this.showBreakComplete();
      }
    }, 60000);
  }

  showBreakComplete() {
    chrome.notifications.create('break_complete', {
      type: 'basic',
      iconUrl: 'ui/assets/icons/icon128.png',
      title: 'Break Time Over',
      message: 'How are you feeling now?',
      buttons: [
        { title: 'Refreshed' },
        { title: 'Need Longer Break' }
      ]
    });
  }
}