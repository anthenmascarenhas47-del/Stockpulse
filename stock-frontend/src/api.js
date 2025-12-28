const BASE_URL = "http://127.0.0.1:8000";

export async function analyzeStock(symbol) {
  const res = await fetch(`${BASE_URL}/analyze/${symbol}`);

  if (!res.ok) throw new Error("Request failed");
  return res.json();
}
