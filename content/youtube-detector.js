// content/youtube-detector.js

class YouTubeBingeDetector {
  constructor() {
    this.port = null;
    this.videoElement = null;
    this.videoId = null;
    this.watchTime = 0;
    this.startTime = null;
    this.trackInterval = null;
    this.reportInterval = null;

    this.init();
  }

  async init() {
    if (!this.isYouTubeWatchPage()) return;

    await this.waitForVideo();

    this.port = chrome.runtime.connect({ name: 'youtube_port' });
    this.videoElement = document.querySelector('video');
    this.videoId = this.getCurrentVideoId();
    this.startTime = Date.now();

    this.setupPageObserver();
    this.startTracking();
    this.startReporting();
  }

  isYouTubeWatchPage() {
    return (
      window.location.hostname.includes('youtube.com') &&
      window.location.pathname === '/watch'
    );
  }

  getCurrentVideoId() {
    return new URLSearchParams(window.location.search).get('v');
  }

  async waitForVideo() {
    while (!document.querySelector('video')) {
      await new Promise((res) => setTimeout(res, 300));
    }
  }

  setupPageObserver() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.onVideoChange();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  onVideoChange() {
    this.sendUsage(); // flush previous
    this.watchTime = 0;
    this.videoId = this.getCurrentVideoId();
    this.startTime = Date.now();
  }

  startTracking() {
    this.trackInterval = setInterval(() => {
      if (this.videoElement && !this.videoElement.paused && !this.videoElement.ended) {
        this.watchTime += 1; // add 1 second
      }
    }, 1000);
  }

  startReporting() {
    this.reportInterval = setInterval(() => {
      this.sendUsage();
    }, 30000); // every 30 seconds
  }

  sendUsage() {
    if (!this.port || !this.videoId || this.watchTime === 0) return;

    this.port.postMessage({
      type: 'youtube_activity',
      data: {
        videoId: this.videoId,
        timeSpent: Math.floor(this.watchTime / 60), // minutes
        isBinge: false,
        sessionDuration: (Date.now() - this.startTime) / 60000
      }
    });

    this.watchTime = 0;
  }
}

new YouTubeBingeDetector();
