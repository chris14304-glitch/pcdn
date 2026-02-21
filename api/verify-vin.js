import fetch from 'node-fetch';

export default async function handler(req, res) {
  const vin = (req.query.vin || '').trim().toUpperCase();

  if (!vin || vin.length !== 17) {
    return res.status(400).json({ valid: false, error: 'VIN must be 17 characters' });
  }

  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`);
    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
      return res.json({ valid: false });
    }

    const result = data.Results[0];
    const valid = result.Make && result.Model && result.ModelYear;

    res.json({
      valid: Boolean(valid),
      make: result.Make,
      model: result.Model,
      year: result.ModelYear
    });
  } catch (err) {
    console.error('VIN verify error:', err);
    res.status(500).json({ valid: false, error: 'Server error fetching VIN' });
  }
}
