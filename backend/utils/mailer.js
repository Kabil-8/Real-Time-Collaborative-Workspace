const nodemailer = require("nodemailer");

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    const error = new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS before sending invitations."
    );
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendWorkspaceInvite({ email, workspaceName, role, token }) {
  const clientOrigin = (process.env.CLIENT_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${clientOrigin}/invite/${token}`;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `You're invited to join ${workspaceName}`,
    text: `You've been invited to join ${workspaceName} as a ${role}. Accept the invitation: ${inviteUrl}`,
    html: `<p>You've been invited to join <strong>${workspaceName}</strong> as a ${role}.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>If the button does not open, copy this link into your browser:</p><p>${inviteUrl}</p>`,
  });

  return inviteUrl;
}

module.exports = { sendWorkspaceInvite };
