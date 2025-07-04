const TRACKING_INTERVAL = 15000;
const BURNOUT_SIGNALS = {
  ERRATIC_WEIGHT: 0.7,
  IDLE_TIMEOUT: 180000
};

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return 'unknown';
  }
}
class MainTracker {
  constructor() {
    this.tabData = new Map();
    this.lastActiveTime = Date.now();
    this.lastScrollY = window.scrollY;
    this.lastScrollTime = Date.now();

    this.setupListeners();
    this.startMonitoring();
  }

  setupListeners() {
    window.addEventListener('click', debounce(this.handleClickEvent.bind(this), 300));
    window.addEventListener('scroll', debounce(this.handleScrollEvent.bind(this), 300));
    window.addEventListener('focus', () => this.lastActiveTime = Date.now());
    window.addEventListener('blur', () => this.flushActiveTime());
  }

  startMonitoring() {
    setInterval(() => this.sendActivityUpdate(), TRACKING_INTERVAL);
  }

  handleClickEvent(event) {
    const erraticScore = this.calculateErraticBehavior(event);
    chrome.runtime.sendMessage({
      type: 'user_interaction',
      data: {
        eventType: 'click',
        tag: event.target.tagName,
        erraticScore,
        domain: getDomain(window.location.href)
      }
    });
  }

  handleScrollEvent() {
    const velocity = this.calculateScrollVelocity();
    chrome.runtime.sendMessage({
      type: 'user_interaction',
      data: {
        eventType: 'scroll',
        velocity,
        domain: getDomain(window.location.href)
      }
    });
  }

  calculateScrollVelocity() {
    const currentY = window.scrollY;
    const now = Date.now();
    const dy = Math.abs(currentY - this.lastScrollY);
    const dt = now - this.lastScrollTime;

    this.lastScrollY = currentY;
    this.lastScrollTime = now;

    return dt > 0 ? (dy / dt) * 1000 : 0; // px/s
  }

  calculateErraticBehavior(event) {
    const tag = event.target.tagName;
    const isErratic = ['A', 'BUTTON', 'DIV'].includes(tag) ? 0.3 : 0.8;
    return isErratic * BURNOUT_SIGNALS.ERRATIC_WEIGHT;
  }

  calculateActiveTime() {
    const now = Date.now();
    const activeTime = now - this.lastActiveTime;
    this.lastActiveTime = now;
    return activeTime;
  }

  flushActiveTime() {
    const activeTime = this.calculateActiveTime();
    chrome.runtime.sendMessage({
      type: 'tab_activity',
      data: {
        domain: getDomain(window.location.href),
        activeTime,
        focusState: false
      }
    });
  }

  sendActivityUpdate() {
    const activeTime = this.calculateActiveTime();
    chrome.runtime.sendMessage({
      type: 'tab_activity',
      data: {
        domain: getDomain(window.location.href),
        activeTime,
        focusState: document.hasFocus()
      }
    });
  }
}

// Init on page load
new MainTracker();
