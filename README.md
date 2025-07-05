# 🧠 Mental Burnout Tracker (Chrome/Edge Extension)

This is a browser extension that tracks your browsing behavior to infer potential signs of **mental fatigue or burnout**, then gives you nudges like meditation prompts or "touch grass" alerts.

## 📦 Features

- 🔍 **Tab Monitoring**: Track tabs opened per hour and frequent tab-switching.
- 📺 **YouTube Binge Detection**: Detects when you're binge-watching YouTube content.
- 🖱️ **Erratic Click Behavior**: Analyzes erratic mouse clicks and scroll behavior.
- 📊 **Mental Load Score**: Computes a score (0–10) indicating your current mental load.
- 🧘 **Wellness Prompts**: Suggests breaks or short meditations based on your load.
- 🔘 **Tracking Toggle**: You can now turn tracking on/off directly from the popup.

## 🧪 Current Status

This is an active WIP (work in progress). Core tracking is working, but a few issues persist.

### ⚠️ Known Bugs / To-Dos

- [ ] **YouTube Time Not Updating** — Needs better video-time tracking.
- [ ] **Avg Focus Time is Hardcoded** — Dynamic calculation pending.
- [ ] **Mental Load Graph Not Updating** — Needs backend state persistence fix.
- [ ] **Extension Stats Reset Randomly** — State isn't persisting consistently.
- [ ] **CORS Warnings / YouTube Content Security** — Some 403s on video analytics.
- [ ] **"Extension context invalidated" Errors** — Happens during tab reloads.

---

## 🧩 Folder Structure

```
mental-burnout-tracker/
├── manifest.json
├── background/
│   ├── worker.js
│   ├── analytics.js
│   ├── intervention-manager.js
│   └── state-manager.js
├── content/
│   ├── main.js
│   └── youtube-detector.js
├── ui/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── dashboard.js
│   │   └── styles.css
│   ├── notification.html
│   ├── notification.js
│   └── assets/
│       └── icons/
├── lib/
│   └── chart.umd.min.js
├── utils/
│   ├── helpers.js
│   └── constants.js
└── options/
    ├── options.html
    ├── options.js
    └── styles.css
```

---

## 🚀 Installation (Development Mode)

1. Clone this repository:
    ```bash
    git clone https://github.com/your-username/mental-burnout-tracker.git
    cd mental-burnout-tracker
    ```

2. Open Chrome/Edge and go to `chrome://extensions`

3. Enable **Developer Mode**

4. Click **"Load Unpacked"** and select this project folder

---

## 👷 Contributing

Got an idea or want to fix a bug? PRs are welcome! Please fork the repo and open a pull request.

---

## 🙋‍♂️ Author

**Shreyas Deb**  
Built for self-care, awareness, and CS innovation.  
Share feedback and ideas to improve this extension!

---

## 📄 License

MIT — feel free to reuse and modify!
