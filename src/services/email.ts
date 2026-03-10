import nodemailer from 'nodemailer';
import { settings } from '../config/settings';

let transporter: nodemailer.Transporter | null = null;

function cleanString(str: string): string {
  // Remove surrounding double quotes if present
  return str.replace(/^"(.*)"$/, '$1');
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const hostRaw = settings.get<string>('smtp_host');
  const port = settings.get<number>('smtp_port', 587);
  const userRaw = settings.get<string>('smtp_user');
  const passRaw = settings.get<string>('smtp_pass');
  const fromRaw = settings.get<string>('smtp_from');

  console.log('SMTP raw settings:', { hostRaw, port, userRaw, passRaw, fromRaw });

  const host = cleanString(hostRaw);
  const user = cleanString(userRaw);
  const pass = cleanString(passRaw);
  const from = fromRaw ? cleanString(fromRaw) : user;

  if (!host || !user || !pass) {
    throw new Error('SMTP settings not configured');
  }

  console.log('SMTP cleaned settings:', { host, port, user, from });

  // Use secure: true only for port 465, false for other ports (STARTTLS)
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true, // keep true in production; set false only for testing
    },
    connectionTimeout: 10000, // 10 seconds
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (err) {
    console.error('❌ SMTP connection failed:', err);
    transporter = null;
    throw err;
  }

  return transporter;
}

export async function resetTransporter(): Promise<void> {
  transporter = null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const mailer = await getTransporter();
    const from = cleanString(settings.get<string>('smtp_from') || settings.get<string>('smtp_user'));
    await mailer.sendMail({ from, to, subject, html });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}