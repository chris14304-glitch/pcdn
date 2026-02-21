import { Resend } from "resend";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // required for file uploads
};

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB per file

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      const {
        firstName,
        lastName,
        email,
        phone,
        policyNumber,
        claimType,
        incidentDate,
        incidentTime,
        incidentLocation,
        incidentDescription
      } = fields;

      if (!firstName || !lastName || !email || !policyNumber || !claimType || !incidentDescription) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Handle attachments
      let attachments = [];
      if (files.documents) {
        const uploadedFiles = Array.isArray(files.documents) ? files.documents : [files.documents];

        for (const file of uploadedFiles) {
          const buffer = fs.readFileSync(file.filepath);
          attachments.push({
            filename: file.originalFilename,
            content: buffer.toString("base64")
          });
        }
      }

      // Send email
      await resend.emails.send({
        from: "Choose My Coverage <support@choosemycoverage.com>",
        to: "yancy@choosemycoverage.com",
        subject: `New Claim Submission - ${claimType}`,
        html: `
          <h2>New Claim Submission</h2>
          <p><strong>Claim Type:</strong> ${claimType}</p>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Policy Number:</strong> ${policyNumber}</p>
          <p><strong>Date & Time of Incident:</strong> ${incidentDate} ${incidentTime}</p>
          <p><strong>Location:</strong> ${incidentLocation || "Not provided"}</p>
          <hr/>
          <p><strong>Incident Description:</strong></p>
          <p>${incidentDescription}</p>
        `,
        attachments
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Claim submission error:", error);
      return res.status(500).json({ error: "Claim submission failed" });
    }
  });
}
