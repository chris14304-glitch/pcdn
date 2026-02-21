import fetch from 'node-fetch';

export default async function handler(req, res) {
  const vin = req.query.vin?.trim();
  if(!vin || vin.length !== 17) return res.status(400).json({ valid: false, error: 'Invalid VIN length' });

  try {
    const nhtsaRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`);
    const json = await nhtsaRes.json();
    const result = json.Results[0];

    // Basic validity check
    const valid = result && result.Make && result.Model && result.ModelYear;
    res.json({
      valid,
      make: result.Make,
      model: result.Model,
      year: result.ModelYear
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, error: 'Server error' });
  }
}
