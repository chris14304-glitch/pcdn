import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Validation & Sanitization Helpers ──

const MAX_SHORT = 255;
const MAX_DESC = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATE_RE = /^[A-Z]{2}$/i;

function sanitize(val: unknown, maxLen = MAX_SHORT): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[<>"'`\\]/g, "") // strip characters used in XSS / SQL injection
    .trim()
    .slice(0, maxLen);
}

function sanitizeAlpha(val: unknown, maxLen = MAX_SHORT): string {
  if (typeof val !== "string") return "";
  return val.replace(/[^a-zA-Z0-9\s\-'.]/g, "").trim().slice(0, maxLen);
}

function toInt(val: unknown): number | null {
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) ? n : null;
}

function toBool(val: unknown): boolean {
  return val === "Yes" || val === true;
}

function toLower(val: unknown, maxLen = MAX_SHORT): string {
  return sanitize(val, maxLen).toLowerCase();
}

function isValidYear(y: number | null): boolean {
  return y !== null && y >= 1900 && y <= new Date().getFullYear() + 2;
}

function isValidAge(a: number | null): boolean {
  return a !== null && a >= 15 && a <= 120;
}

const VALID_PARKING = ["garage", "street", "driveway", "other"];
const VALID_USAGE = ["commute", "pleasure", "business", "rideshare"];
const VALID_GENDER = ["male", "female", "non-binary", "other"];
const VALID_RECORD_TYPES = ["accident", "violation", "claim", "ticket", "dui", "other"];

function isOneOf(val: string, allowed: string[]): boolean {
  return allowed.includes(val);
}

// ── Handler ──

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, vehicle, insurance, drivers, address, claims } = req.body;

  // ── Validate userId ──
  const cleanUserId = sanitize(userId);
  if (!cleanUserId || !UUID_RE.test(cleanUserId)) {
    return res.status(400).json({ error: "Invalid or missing user ID" });
  }

  try {
    // ══════════════════════════════
    //  VALIDATE & INSERT VEHICLE
    // ══════════════════════════════
    if (!vehicle || typeof vehicle !== "object") {
      return res.status(400).json({ error: "Missing vehicle data" });
    }

    const vYear = toInt(vehicle.aYear);
    if (!isValidYear(vYear)) {
      return res.status(400).json({ error: "Invalid vehicle year" });
    }

    const vMake = toLower(vehicle.aMake);
    const vModel = toLower(vehicle.aModel);
    if (!vMake || !vModel) {
      return res.status(400).json({ error: "Vehicle make and model are required" });
    }

    const vMileage = toInt(vehicle.aMileage);
    const vAnnualMiles = toInt(vehicle.aAnnualMiles);
    if (vMileage === null || vMileage < 0 || vMileage > 999999) {
      return res.status(400).json({ error: "Invalid mileage" });
    }
    if (vAnnualMiles === null || vAnnualMiles < 0 || vAnnualMiles > 200000) {
      return res.status(400).json({ error: "Invalid annual miles" });
    }

    const vParking = toLower(vehicle.aParking);
    const vUsage = toLower(vehicle.aUsage);
    if (!isOneOf(vParking, VALID_PARKING)) {
      return res.status(400).json({ error: "Invalid parking type" });
    }
    if (!isOneOf(vUsage, VALID_USAGE)) {
      return res.status(400).json({ error: "Invalid usage type" });
    }

    const vVin = sanitize(vehicle.aVin, 17);
    if (vVin && !VIN_RE.test(vVin)) {
      return res.status(400).json({ error: "Invalid VIN format" });
    }

    const { error: vehicleError } = await supabase.from("vehicle").insert({
      user_id: cleanUserId,
      vin: vVin || null,
      year: vYear,
      make: vMake,
      model: vModel,
      mileage: vMileage,
      annual_miles: vAnnualMiles,
      parking_type: vParking,
      usage_type: vUsage,
      has_anti_theft: toBool(vehicle.aAntiTheft),
    });

    if (vehicleError) throw vehicleError;

    // ══════════════════════════════
    //  VALIDATE & INSERT INSURANCE
    // ══════════════════════════════
    if (!insurance || typeof insurance !== "object") {
      return res.status(400).json({ error: "Missing insurance data" });
    }

    const { error: insuranceError } = await supabase
      .from("auto_insurance")
      .insert({
        user_id: cleanUserId,
        currently_insured: toBool(insurance.aInsured),
        prior_insurance_lapse: toBool(insurance.aLapse),
        bi_liability_limit: sanitize(insurance.aBIL, 50),
        pd_liability_limit: sanitize(insurance.aPDL, 50),
        pip_limit: sanitize(insurance.aPIP, 50),
        comprehensive: toBool(insurance.aComp),
        collision: toBool(insurance.aColl),
        comprehensive_deductible: sanitize(insurance.aCompDed, 50),
        collison_deductible: sanitize(insurance.aCollDed, 50),
        roadside: toBool(insurance.aRoadside),
      });

    if (insuranceError) throw insuranceError;

    // ══════════════════════════════
    //  VALIDATE & INSERT DRIVERS
    // ══════════════════════════════
    if (!Array.isArray(drivers) || drivers.length === 0) {
      return res.status(400).json({ error: "At least one driver is required" });
    }

    if (drivers.length > 10) {
      return res.status(400).json({ error: "Too many drivers" });
    }

    for (const driver of drivers) {
      if (!driver || typeof driver !== "object") {
        return res.status(400).json({ error: "Invalid driver data" });
      }

      const dFirst = sanitizeAlpha(driver.firstName, 100);
      const dLast = sanitizeAlpha(driver.lastName, 100);
      const dAge = toInt(driver.age);
      const dGender = toLower(driver.gender, 20);

      if (!dFirst || !dLast) {
        return res.status(400).json({ error: "Driver first and last name are required" });
      }
      if (!isValidAge(dAge)) {
        return res.status(400).json({ error: "Invalid driver age" });
      }
      if (!isOneOf(dGender, VALID_GENDER)) {
        return res.status(400).json({ error: "Invalid driver gender" });
      }

      const { error: driverError } = await supabase.from("drivers").insert({
        user_id: cleanUserId,
        first_name: dFirst,
        last_name: dLast,
        age: dAge,
        gender: dGender,
      });

      if (driverError) throw driverError;
    }

    // ══════════════════════════════
    //  VALIDATE & INSERT ADDRESS
    // ══════════════════════════════
    if (!address || typeof address !== "object") {
      return res.status(400).json({ error: "Missing address data" });
    }

    const aLine1 = sanitize(address.aAddr1);
    const aCity = sanitizeAlpha(address.aCity, 100);
    const aState = sanitize(address.aState, 2).toUpperCase();
    const aZip = sanitize(address.aLocZip, 10);

    if (!aLine1 || !aCity) {
      return res.status(400).json({ error: "Address line 1 and city are required" });
    }
    if (!STATE_RE.test(aState)) {
      return res.status(400).json({ error: "Invalid state" });
    }
    if (!ZIP_RE.test(aZip)) {
      return res.status(400).json({ error: "Invalid ZIP code" });
    }

    const { error: addressError } = await supabase
      .from("auto_address")
      .insert({
        user_id: cleanUserId,
        address_line1: aLine1,
        address_line2: sanitize(address.aAddr2),
        city: aCity,
        state: aState,
        zip_code: aZip,
      });

    if (addressError) throw addressError;

    // ══════════════════════════════
    //  VALIDATE & INSERT CLAIMS
    // ══════════════════════════════
    if (claims && Array.isArray(claims) && claims.length > 0) {
      if (claims.length > 20) {
        return res.status(400).json({ error: "Too many claims" });
      }

      for (const claim of claims) {
        if (!claim || typeof claim !== "object") {
          return res.status(400).json({ error: "Invalid claim data" });
        }

        const cType = toLower(claim.type, 50);
        const cDesc = sanitize(claim.description, MAX_DESC);
        const cDate = sanitize(claim.date, 10);

        if (!cType || !isOneOf(cType, VALID_RECORD_TYPES)) {
          return res.status(400).json({ error: "Invalid claim record type" });
        }
        if (!cDesc) {
          return res.status(400).json({ error: "Claim description is required" });
        }
        if (cDate && !DATE_RE.test(cDate)) {
          return res.status(400).json({ error: "Invalid claim date format (YYYY-MM-DD)" });
        }

        const { error: claimError } = await supabase
          .from("auto_claim")
          .insert({
            user_id: cleanUserId,
            record_type: cType,
            description: cDesc,
            incident_date: cDate || null,
            at_fault: toBool(claim.atFault),
          });

        if (claimError) throw claimError;
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: "Submission failed" });
  }
}
