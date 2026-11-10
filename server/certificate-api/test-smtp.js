
import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  requireTLS: Number(process.env.SMTP_PORT || 587) === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  console.log("Checking SMTP connection...");

  await transporter.verify();

  const result = await transporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: "rk2072116@gmail.com",
  subject: "eSparks Certificate Portal - SMTP Test",
  text: "SMTP email integration is working successfully!",
});

console.log("Test email sent:", result.messageId);

  console.log("SMTP CONNECTION SUCCESSFUL!");
} catch (error) {
  console.error("SMTP CONNECTION FAILED!");
  console.error(error.message);
}
