import { getAIInsight } from '../../utils/ai-api.js';
const aiBtn = document.getElementById('get-ai-insight');
const aiDiv = document.getElementById('ai-insight');

aiBtn.addEventListener('click', async () => {
  aiBtn.disabled = true;
  aiDiv.textContent = "Thinking...";
  const summary = "Today: opened 18 tabs, switched focus often, and worked after midnight.";
  const advice = await getAIInsight(summary, "Give actionable burnout advice.");
  aiDiv.textContent = advice;
  aiBtn.disabled = false;
});
