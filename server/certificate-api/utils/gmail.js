import crypto from "node:crypto";

async function getGmailAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN."
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error(
      `Gmail OAuth token refresh failed: ${
        result.error_description ||
        result.error ||
        response.statusText
      }`
    );
  }

  return result.access_token;
}

function encodeMimeHeader(value) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  return `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function wrapBase64(value) {
  return String(value).match(/.{1,76}/g)?.join("\r\n") || "";
}

function buildRawEmail({ from, to, subject, text, html }) {
  const safeFrom = String(from).replace(/[\r\n<>]/g, "");
  const safeTo = String(to).replace(/[\r\n<>]/g, "");
  const boundary = `certificate-${crypto.randomUUID()}`;

  const textBody = wrapBase64(
    Buffer.from(String(text ?? ""), "utf8").toString("base64")
  );

  const htmlBody = wrapBase64(
    Buffer.from(String(html ?? ""), "utf8").toString("base64")
  );

  const mime = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    textBody,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    htmlBody,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  return Buffer.from(mime, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function sendGmailEmail({
  to,
  subject,
  text,
  html
}) {
  if (!to || !String(to).trim()) {
    throw new Error("Email recipient is required.");
  }

  const gmailUser =
    process.env.GMAIL_USER || "nsujalkant@gmail.com";

  const from = process.env.MAIL_FROM || gmailUser;
  const accessToken = await getGmailAccessToken();

  const raw = buildRawEmail({
    from,
    to: String(to).trim(),
    subject,
    text,
    html
  });

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(gmailUser)}/messages/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw })
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gmail API send failed (${response.status}): ${errorBody.slice(0, 500)}`
    );
  }

  return true;
}