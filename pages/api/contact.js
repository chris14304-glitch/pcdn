import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { firstName, lastName, email, phone, topic, message } = req.body;

    await resend.emails.send({
      from: "Choose My Coverage <support@choosemycoverage.com>",
      to: "yancy@choosemycoverage.com",
      subject: `New Contact Form Submission - ${topic}`,
      html: `<h2>New Contact Form Submission</h2>
        <p><strong>First Name:</strong> ${firstName}</p>
        <p><strong>Last Name:</strong> ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Topic:</strong> ${topic}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>${message}</p>`
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ error: "Email failed to send" });
  }
}
