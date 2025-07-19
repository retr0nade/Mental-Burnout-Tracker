// utils/ai-api.js
const HF_API_URL = "https://retr0nade--Mental-Burnout-Tracker.hf.space/api/predict/";

export async function getAIInsight(prompt, context = "") {
  const payload = { data: [prompt, context] };
  try {
    const resp = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    return data.data ? data.data[0] : "AI did not return a valid response.";
  } catch (err) {
    return "AI is unavailable right now.";
  }
}
