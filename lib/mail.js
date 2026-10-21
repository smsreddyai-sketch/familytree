import nodemailer from 'nodemailer';

const SITE_NAME = 'SAMA Family Tree';

// Emails are sent from a Gmail account using a Google "App password".
async function send(to, subject, text) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Email to ${to}: ${subject}\n${text}`);
      return;
    }
    throw new Error('Email is not set up yet (GMAIL_USER / GMAIL_APP_PASSWORD missing).');
  }

  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transport.sendMail({ from: `"${SITE_NAME}" <${user}>`, to, subject, text });
}

export function sendLoginCode(email, code) {
  return send(
    email,
    `Your ${SITE_NAME} login code: ${code}`,
    `Your login code is ${code}\n\nIt expires in 10 minutes. If you did not try to log in, you can ignore this email.`
  );
}

export function sendInvite(email, { treeName, invitedBy, siteUrl }) {
  return send(
    email,
    `You're invited to the ${treeName} family tree`,
    `${invitedBy} has invited you to see the "${treeName}" family tree.\n\n` +
      `Open ${siteUrl} and log in with this email address (${email}).\n` +
      `There is no password: we email you a 6-digit code each time you log in.`
  );
}
