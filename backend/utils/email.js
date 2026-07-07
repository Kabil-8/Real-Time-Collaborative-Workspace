const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

/**
 * Send an email using nodemailer.
 * If SMTP configuration is not present, falls back to logging to console.
 */
const sendEmail = async (options) => {
  let host = process.env.SMTP_HOST;
  let port = process.env.SMTP_PORT;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  let isSmtpConfigured = host && port && user && pass;

  if (!isSmtpConfigured) {
    try {
      console.log("SMTP not configured. Generating a temporary Ethereal SMTP account...");
      const testAccount = await nodemailer.createTestAccount();
      host = "smtp.ethereal.email";
      port = 587;
      user = testAccount.user;
      pass = testAccount.pass;
      isSmtpConfigured = true;

      // Persist to .env so we don't have to create it again next time
      const envPath = path.join(__dirname, "../.env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        // Append SMTP keys
        envContent += `\n# Ethereal SMTP configurations auto-generated\nSMTP_HOST=smtp.ethereal.email\nSMTP_PORT=587\nSMTP_USER=${user}\nSMTP_PASS=${pass}\n`;
        fs.writeFileSync(envPath, envContent, "utf8");
        console.log("Ethereal SMTP credentials generated and saved to .env!");
      }

      // Also set them on process.env for the current execution
      process.env.SMTP_HOST = host;
      process.env.SMTP_PORT = port.toString();
      process.env.SMTP_USER = user;
      process.env.SMTP_PASS = pass;
    } catch (err) {
      console.error("Failed to generate Ethereal SMTP account:", err);
    }
  }

  if (!isSmtpConfigured) {
    console.log("\n========================================================");
    console.log("⚠️  SMTP NOT CONFIGURABLE - EMAIL CONSOLE FALLBACK ⚠️");
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("--------------------------------------------------------");
    console.log(`Text Body:\n${options.text}`);
    if (options.html) {
      console.log("--------------------------------------------------------");
      console.log(`HTML Body:\n${options.html}`);
    }
    console.log("========================================================\n");
    return { success: false, consoleFallback: true };
  }

  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port, 10),
    auth: {
      user: user,
      pass: pass,
    },
  });

  // 2) Define email options
  const mailOptions = {
    from: `Zaalima Workspace <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  // 3) Actually send the email
  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  
  console.log("\n========================================================");
  console.log("✉️  Email sent successfully!");
  console.log(`Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`Preview URL: ${previewUrl}`);
  }
  console.log("========================================================\n");

  return { success: true, messageId: info.messageId, previewUrl };
};

module.exports = sendEmail;
