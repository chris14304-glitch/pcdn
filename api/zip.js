export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { zip } = req.body;

  // 1️⃣ Basic format validation
  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({
      valid: false,
      error: "Invalid ZIP format"
    });
  }

  try {
    // 2️⃣ Verify ZIP exists
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);

    if (!response.ok) {
      return res.status(404).json({
        valid: false,
        error: "ZIP code not found"
      });
    }

    const data = await response.json();
    const place = data.places[0];
    const state = place["state abbreviation"];
    const city = place["place name"];

    // 3️⃣ Restrict to states you operate in
    const allowedStates = ["UT"]; // change to what you support

    if (!allowedStates.includes(state)) {
      return res.status(403).json({
        valid: false,
        error: "We do not currently operate in this state"
      });
    }

    // 4️⃣ Success
    return res.status(200).json({
      valid: true,
      zip,
      city,
      state
    });

  } catch (error) {
    return res.status(500).json({
      valid: false,
      error: "ZIP validation failed"
    });
  }
}
