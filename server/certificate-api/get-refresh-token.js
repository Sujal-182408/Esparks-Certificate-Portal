import "dotenv/config";
import http from "node:http";
import crypto from "node:crypto";

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env");
  process.exit(1);
}

const state = crypto.randomBytes(24).toString("hex");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end("Not found");
    return;
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("Invalid state. Run the script again.");
    server.close();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400).end("Authorization failed. Check your terminal.");
    console.error("Google authorization error:", error || "No code returned");
    server.close();
    return;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Token exchange failed:",
        data.error,
        data.error_description || "",
      );
      res.writeHead(400).end("Token exchange failed. Check your terminal.");
      server.close();
      return;
    }

    if (!data.refresh_token) {
      console.error(
        "Google did not return a refresh token. Revoke the app's previous grant and retry authorization.",
      );
      res.writeHead(400).end("No refresh token returned. Check your terminal.");
      server.close();
      return;
    }

    console.log("\nRefresh token generated successfully:\n");
    console.log("\nRefresh token generated successfully.");
    console.log(
      "Add the token securely to GMAIL_REFRESH_TOKEN in your local .env file.",
    );
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Authorization successful! Return to your terminal.");
    console.log("\nCopy it into GMAIL_REFRESH_TOKEN in your .env file.");
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Authorization successful! Return to your terminal.");
  } catch (err) {
    console.error("Token exchange failed:", err.message);
    res.writeHead(500).end("Token exchange failed.");
  } finally {
    server.close();
  }
});

server.listen(3000, "localhost", () => {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();

  console.log(
    "Open this URL in your browser and authorize nsujalkant@gmail.com:\n",
  );
  console.log(authUrl.toString());
});
