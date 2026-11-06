import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Email goes out over SMTP, set by SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and
// MAIL_FROM (see "Email" in the README). Without them, development prints each
// email to the server's console instead, and production can't send any.

export type Mail = { to: string; subject: string; text: string; html: string };

const REQUIRED = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"] as const;

type Mailer = { send(mail: Mail): Promise<void> };

function createMailer(): Mailer | null {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length === REQUIRED.length) {
    if (process.env.NODE_ENV === "production") return null;
    return {
      async send({ to, subject, text }) {
        console.info(`Email to ${to} (not sent: SMTP isn't set up)\nSubject: ${subject}\n\n${text}`);
      },
    };
  }
  if (missing.length) throw new Error(`Email also needs ${missing.join(", ")}.`);

  const port = Number(process.env.SMTP_PORT || 587);
  const transport: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 speaks TLS from the start; any other port has to upgrade with STARTTLS
    // before the password is sent.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
  const from = process.env.MAIL_FROM!;
  return {
    async send(mail) {
      await transport.sendMail({ from, ...mail });
    },
  };
}

let mailer: Mailer | null | undefined;

function getMailer() {
  if (mailer === undefined) mailer = createMailer();
  return mailer;
}

/**
 * Whether email can go out (or, in development, be printed). Throws if the
 * settings are incomplete, so the server reports that when it starts.
 */
export function canSendMail() {
  return getMailer() !== null;
}

export async function sendMail(mail: Mail) {
  const current = getMailer();
  if (!current) throw new Error("Email isn't set up: see “Email” in the README.");
  await current.send(mail);
}
