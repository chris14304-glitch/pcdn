import { Resend } from "resend";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // required for file uploads
  },
};

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024 }); // 5MB

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      const first = fields.firstName;
      const last = fields.lastName;
      const email = fields.email;
      const role = fields.role;

      if (!first || !last || !email) {
        return res.status(400).json({ error: "Missing fields" });
      }

      let attachments = [];

      if (files.resume) {
        const file = files.resume[0];
        const fileBuffer = fs.readFileSync(file.filepath);
        const base64File = fileBuffer.toString("base64");

        attachments.push({
          filename: file.originalFilename,
          content: base64File,
        });
      }

      await resend.emails.send({
        from: "Choose My Coverage <support@choosemycoverage.com>",
        to: "yancy@choosemycoverage.com",
        subject: `New Job Application - ${role}`,
        html: `
          <h2>New Application</h2>
          <p><strong>Name:</strong> ${first} ${last}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role}</p>
        `,
        attachments,
      });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("Application error:", error);
      return res.status(500).json({ error: "Application failed" });
    }
  });
}
