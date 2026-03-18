import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Validation helpers ---

const MAX_FIELD_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]{7,20}$/;

function sanitizeString(value, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Handler ---

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.choosemycoverage.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { firstName: rawFirst, lastName: rawLast, email: rawEmail, phone: rawPhone, topic: rawTopic, message: rawMessage } = req.body;

    // Sanitize all fields
    const firstName = sanitizeString(rawFirst);
    const lastName = sanitizeString(rawLast);
    const email = sanitizeString(rawEmail);
    const topic = sanitizeString(rawTopic);
    const message = sanitizeString(rawMessage, MAX_MESSAGE_LENGTH);
    const phone = rawPhone ? sanitizeString(rawPhone) : null;

    // Validate required fields
    if (!firstName || !lastName || !email || !topic || !message) {
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

    // Insert into Supabase
    const { error: dbError } = await supabase.from("contact_us").insert([
      {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        topic,
        message,
      },
    ]);

    if (dbError) {
      throw new Error("Database insert failed");
    }

    // Send Email (HTML-escape user input to prevent injection)
    await resend.emails.send({
      from: `Choose My Coverage <${process.env.FROM_EMAIL}>`,
      to: process.env.TO_EMAIL,
      subject: `New Contact Form Submission - ${topic}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>First Name:</strong> ${escapeHtml(firstName)}</p>
        <p><strong>Last Name:</strong> ${escapeHtml(lastName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${phone ? escapeHtml(phone) : "Not provided"}</p>
        <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message)}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Submission failed" });
  }
}
