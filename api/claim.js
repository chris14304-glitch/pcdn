import { Resend } from "resend";
import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: false },
};

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      // Helper to handle formidable fields being arrays or strings
      const getSingleValue = (val) => (Array.isArray(val) ? val[0] : val);

      const userId = getSingleValue(fields.userId);
      const firstName = getSingleValue(fields.firstName);
      const lastName = getSingleValue(fields.lastName);
      const email = getSingleValue(fields.email);
      const phone = getSingleValue(fields.phone);
      const policyNumber = getSingleValue(fields.policyNumber);
      const claimType = getSingleValue(fields.claimType);
      const incidentDate = getSingleValue(fields.incidentDate);
      const incidentTime = getSingleValue(fields.incidentTime);
      const incidentLocation = getSingleValue(fields.incidentLocation);
      const incidentDescription = getSingleValue(fields.incidentDescription);

      // Now the Supabase insert will receive a clean string
      const { error: dbError } = await supabase.from("claim").insert([
        {
          user_id: userId || null, // This will now be "9bed1f02..." instead of ["9bed1f02..."]
          first_name: firstName,
          last_name: lastName,
          policy_number: policyNumber,
          email,
          phone: phone || null,
          incident_date: incidentDate,
          incident_time: incidentTime,
          location: incidentLocation,
          description: incidentDescription,
        },
      ]);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Claim submission error:", error);
      return res.status(500).json({ error: "Claim submission failed" });
    }
  });
}
