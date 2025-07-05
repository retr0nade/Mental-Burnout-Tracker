// content/youtube-detector.js
if (window.__youtubeBingeDetectorInjected__) {
  console.log('[YouTubeDetector] Already injected, skipping.');
} else {
  window.__youtubeBingeDetectorInjected__ = true;

  class YouTubeBingeDetector {
    constructor() {
      this.videoId = null;
      this.watchedVideos = new Set();
      this.sessionStart = Date.now();
      this.videoStartTime = null;
      this.sendTimer = null;

      this.init();
    }

    init() {
      this.observePageChanges();
      this.startUsageTimer();
    }

    observePageChanges() {
      const observer = new MutationObserver(() => {
        const newVideoId = this.getCurrentVideoId();
        if (newVideoId && newVideoId !== this.videoId) {
          this.handleVideoSwitch(newVideoId);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Initial check
      const current = this.getCurrentVideoId();
      if (current) this.handleVideoSwitch(current);
    }

    getCurrentVideoId() {
      return new URLSearchParams(window.location.search).get('v');
    }

    handleVideoSwitch(newVideoId) {
      this.sendUsage(); // send data for previous video
      this.videoId = newVideoId;
      this.videoStartTime = Date.now();
      this.watchedVideos.add(newVideoId);
    }

    startUsageTimer() {
      this.sendTimer = setInterval(() => {
        this.sendUsage();
      }, 30000);
    }

    sendUsage() {
      if (!this.videoId || !this.videoStartTime) return;

      const now = Date.now();
      const timeSpent = Math.floor((now - this.videoStartTime) / 1000); // seconds

      chrome.storage.local.get('trackingEnabled', (result) => {
        if (result.trackingEnabled === false) {
          console.log('[YouTubeDetector] Tracking disabled. Skipping usage send.');
          return;
        }

        const message = {
          type: 'youtube_activity',
          data: {
            videoId: this.videoId,
            isBinge: this.watchedVideos.size > 3,
            timeSpent,
            sessionDuration: Math.floor((now - this.sessionStart) / 60000)
          }
        };

        try {
          chrome.runtime.sendMessage(message);
          console.log('[YouTubeDetector] Sent activity:', message);
        } catch (err) {
          console.warn('[YouTubeDetector] Cannot send message: context invalidated', err);
        }

        this.videoStartTime = now;
      });
    }
  }

  if (
    window.location.hostname.includes('youtube.com') &&
    window.location.pathname === '/watch'
  ) {
    window.addEventListener('load', () => {
      new YouTubeBingeDetector();
    });
  }
}
