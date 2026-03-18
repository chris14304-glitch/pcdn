import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // required for file uploads
  },
};

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Validation helpers ---

const MAX_FIELD_LENGTH = 255;
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["application/pdf"];
const ALLOWED_EXTENSIONS = [".pdf"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(value) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

function validateResumeFile(file) {
  const ext = path.extname(file.originalFilename || "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Invalid file extension. Only .pdf files are accepted.";
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return "Invalid file type. Only PDF files are accepted.";
  }

  if (file.size > MAX_RESUME_SIZE) {
    return "File too large. Maximum size is 5 MB.";
  }

  return null; // no error
}

// --- Handler ---

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.choosemycoverage.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ maxFileSize: MAX_RESUME_SIZE });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      // Sanitize and validate text fields
      const firstName = sanitizeString(fields.firstName);
      const lastName = sanitizeString(fields.lastName);
      const email = sanitizeString(fields.email);
      const role = sanitizeString(fields.role);

      if (!firstName || !lastName || !email || !role) {
        return res.status(400).json({ error: "Missing or invalid fields" });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Insert into Supabase
      const { error: dbError } = await supabase.from("application").insert([
        {
          first_name: firstName,
          last_name: lastName,
          email,
          position: role,
        },
      ]);

      if (dbError) {
        throw new Error("Database insert failed");
      }

      // Handle file attachment if present
      let attachments = [];
      if (files.resume) {
        const file = Array.isArray(files.resume) ? files.resume[0] : files.resume;

        const fileError = validateResumeFile(file);
        if (fileError) {
          return res.status(400).json({ error: fileError });
        }

        const fileBuffer = fs.readFileSync(file.filepath);
        const base64File = fileBuffer.toString("base64");

        attachments.push({
          filename: file.originalFilename,
          content: base64File,
        });
      }

      // Send Email via Resend
      await resend.emails.send({
        from: `Choose My Coverage <${process.env.FROM_EMAIL}>`,
        to: process.env.TO_EMAIL,
        subject: `New Job Application - ${role}`,
        html: `
          <h2>New Application</h2>
          <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Role:</strong> ${role}</p>
        `,
        attachments,
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Application failed" });
    }
  });
}
