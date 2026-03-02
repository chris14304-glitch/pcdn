import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server only
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, vehicle, insurance, drivers, address, claims } = req.body;

  try {

    /* =========================
       INSERT VEHICLE
    ========================== */
    const { error: vehicleError } = await supabase
      .from("vehicle")
      .insert({
        user_id: userId,
        vin: vehicle.aVin,
        year: parseInt(vehicle.aYear),
        make: vehicle.aMake.toLowerCase(),
        model: vehicle.aModel.toLowerCase(),
        mileage: parseInt(vehicle.aMileage),
        annual_miles: parseInt(vehicle.aAnnualMiles),
        parking_type: vehicle.aParking.toLowerCase(),
        usage_type: vehicle.aUsage.toLowerCase(),
        has_anti_theft: vehicle.aAntiTheft === "Yes"
      });

    if (vehicleError) throw vehicleError;


    /* =========================
       INSERT INSURANCE
    ========================== */
    const { error: insuranceError } = await supabase
      .from("auto_insurance")
      .insert({
        user_id: userId,
        currently_insured: insurance.aInsured === "Yes",
        prior_insurance_lapse: insurance.aLapse === "Yes",
        bi_liability_limit: insurance.aBIL,
        pd_liability_limit: insurance.aPDL,
        pip_limit: insurance.aPIP,
        comprehensive: insurance.aComp === "Yes",
        collision: insurance.aColl === "Yes",
        comprehensive_deductible: insurance.aCompDed,
        collison_deductible: insurance.aCollDed,
        roadside: insurance.aRoadside === "Yes"
      });

    if (insuranceError) throw insuranceError;


    /* =========================
       INSERT DRIVERS (loop)
    ========================== */
    for (const driver of drivers) {
      const { error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          first_name: driver.firstName,
          last_name: driver.lastName,
          age: parseInt(driver.age),
          gender: driver.gender.toLowerCase()
        });

      if (driverError) throw driverError;
    }


    /* =========================
       INSERT ADDRESS
    ========================== */
    const { error: addressError } = await supabase
      .from("auto_address")
      .insert({
        user_id: userId,
        address_line1: address.aAddr1,
        address_line2: address.aAddr2,
        city: address.aCity,
        state: address.aState,
        zip_code: address.aLocZip
      });

    if (addressError) throw addressError;


    /* =========================
       INSERT CLAIMS (loop)
    ========================== */
    if (claims?.length) {
      for (const claim of claims) {
        const { error: claimError } = await supabase
          .from("auto_claim")
          .insert({
            user_id: userId,
            record_type: claim.type.toLowerCase(),
            description: claim.description,
            incident_date: claim.date,
            at_fault: claim.atFault === "Yes"
          });

        if (claimError) throw claimError;
      }
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
