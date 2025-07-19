import { getAIInsight } from '../../utils/ai-api.js';

const aiSection = document.getElementById('ai-insight-section');
const aiButton = document.getElementById('get-ai-insight');
const aiOutput = document.getElementById('ai-insight');

aiButton.addEventListener('click', async () => {
  aiOutput.textContent = "Thinking...";
  // Build the activity summary (replace with real stats gathering logic)
  const summary = await buildSummaryForToday(); // custom function
  const advice = await getAIInsight(
    summary,
    "Provide actionable, non-judgmental burnout advice based on this usage pattern."
  );
  aiOutput.textContent = advice;
});

const journalInput = document.getElementById('journal-entry');
const journalBtn = document.getElementById('analyze-journal');
const journalFeedback = document.getElementById('journal-feedback');

journalBtn.addEventListener('click', async () => {
  journalFeedback.textContent = "Analyzing...";
  const text = journalInput.value.trim();
  if (!text) return;
  const result = await getAIInsight(
    text,
    "summarize this as a journal coach: offer validation and a gentle suggestion."
  );
  journalFeedback.textContent = result;
});

