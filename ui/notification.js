// ui/notification.js
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const level = params.get('level');
  
  // Show appropriate intervention
  if (level === 'severe') {
    document.getElementById('severeIntervention').style.display = 'block';
  } else {
    document.getElementById('moderateIntervention').style.display = 'block';
  }

  // Button actions
  document.getElementById('startBreakBtn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'start_break', duration: 15 });
    window.close();
  });

  document.getElementById('quickMeditateBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.youtube.com/watch?v=inpok4MKVLM' });
  });

  document.getElementById('natureSoundBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mynoise.net/NoiseMachines/natureSoundGenerator.php' });
  });
});