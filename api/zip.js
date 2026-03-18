export default async function handler(req, res) {
  // Always set CORS headers first
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { zip } = req.body;

    if (!zip || !/^\d{5}$/.test(zip)) {
      return res.status(400).json({ valid: false });
    }

    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);

    if (!response.ok) {
      return res.status(404).json({ valid: false });
    }

    const data = await response.json();
    const state = data?.places?.[0]?.["state abbreviation"];

    if (state !== "UT") {
      return res.status(403).json({ valid: false });
    }

    return res.status(200).json({ valid: true });

  } catch (err) {
    return res.status(500).json({ valid: false });
  }
}
