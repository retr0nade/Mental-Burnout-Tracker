document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const { settings } = await chrome.storage.local.get('settings');
  
  // Set UI to saved values
  if (settings) {
    document.getElementById('enableInterventions').checked = settings.interventionsEnabled;
    document.getElementById('sensitivityLevel').value = settings.sensitivity;
    
    settings.preferredActivities.forEach(activity => {
      const checkbox = document.querySelector(`input[value="${activity}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }

  // Save on button click
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const newSettings = {
      interventionsEnabled: document.getElementById('enableInterventions').checked,
      sensitivity: document.getElementById('sensitivityLevel').value,
      preferredActivities: Array.from(
        document.querySelectorAll('input[name="breakActivity"]:checked')
      ).map(el => el.value)
    };

    await chrome.storage.local.set({ settings: newSettings });
    alert('Preferences saved!');
  });
});

document.getElementById("ai-features-toggle").addEventListener("change", evt => {
  const enabled = evt.target.checked;
  chrome.storage.local.set({ aiFeaturesEnabled: enabled });
});
