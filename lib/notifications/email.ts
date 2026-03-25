import sgMail from '@sendgrid/mail'
import { env } from '@/lib/env'

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY)
}

export interface EmailPayload {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: EmailPayload): Promise<void> {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) return
  await sgMail.send({
    from: env.SENDGRID_FROM_EMAIL,
    to,
    subject,
    text,
    html: html ?? text,
  })
}
