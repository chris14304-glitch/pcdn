import { Resend } from "resend";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: false },
};

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Validation helpers ---

const MAX_FIELD_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]{7,20}$/;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function sanitizeString(value, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

function validateUploadedFile(file) {
  const ext = path.extname(file.originalFilename || "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Invalid file extension. Only .pdf, .png, and .jpg files are accepted.";
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return "Invalid file type. Only PDF and image files are accepted.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 10 MB.";
  }

  return null;
}

// --- Handler ---

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.choosemycoverage.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ maxFileSize: MAX_FILE_SIZE });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      // Helper to handle formidable fields being arrays or strings
      const getSingleValue = (val) => (Array.isArray(val) ? val[0] : val);

      // Sanitize all fields
      const userId = sanitizeString(getSingleValue(fields.userId));
      const firstName = sanitizeString(getSingleValue(fields.firstName));
      const lastName = sanitizeString(getSingleValue(fields.lastName));
      const email = sanitizeString(getSingleValue(fields.email));
      const phone = sanitizeString(getSingleValue(fields.phone));
      const policyNumber = sanitizeString(getSingleValue(fields.policyNumber));
      const claimType = sanitizeString(getSingleValue(fields.claimType));
      const incidentDate = sanitizeString(getSingleValue(fields.incidentDate));
      const incidentTime = sanitizeString(getSingleValue(fields.incidentTime));
      const incidentLocation = sanitizeString(getSingleValue(fields.incidentLocation));
      const incidentDescription = sanitizeString(
        getSingleValue(fields.incidentDescription),
        MAX_DESCRIPTION_LENGTH
      );

      // Validate required fields
      if (!firstName || !lastName || !email || !policyNumber || !incidentDate || !incidentDescription) {
        return res.status(400).json({ error: "Missing or invalid required fields" });
      }

      // Validate email format
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Validate phone format if provided
      if (phone && !PHONE_REGEX.test(phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      // Validate any uploaded files
      const fileKeys = Object.keys(files);
      for (const key of fileKeys) {
        const fileOrFiles = files[key];
        const fileList = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
        for (const file of fileList) {
          const fileError = validateUploadedFile(file);
          if (fileError) {
            return res.status(400).json({ error: fileError });
          }
        }
      }

      // Supabase insert
      const { error: dbError } = await supabase.from("claim").insert([
        {
          user_id: userId || null,
          first_name: firstName,
          last_name: lastName,
          policy_number: policyNumber,
          email,
          phone: phone || null,
          incident_date: incidentDate,
          incident_time: incidentTime || null,
          location: incidentLocation || null,
          description: incidentDescription,
        },
      ]);

      if (dbError) {
        throw new Error("Database insert failed");
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Claim submission failed" });
    }
  });
}
