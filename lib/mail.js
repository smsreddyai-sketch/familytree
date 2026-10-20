import nodemailer from 'nodemailer';

// Login codes are sent from a Gmail account using a Google "App password".
export async function sendLoginCode(email, code) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Login code for ${email}: ${code}`);
      return;
    }
    throw new Error('Email login is not set up yet (GMAIL_USER / GMAIL_APP_PASSWORD missing).');
  }

  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transport.sendMail({
    from: `"Family Tree" <${user}>`,
    to: email,
    subject: `Your Family Tree login code: ${code}`,
    text: `Your login code is ${code}\n\nIt expires in 10 minutes. If you did not try to log in, you can ignore this email.`,
  });
}
