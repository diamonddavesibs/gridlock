import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export interface EmailPayload {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: EmailPayload): Promise<void> {
  await sgMail.send({
    from: process.env.SENDGRID_FROM_EMAIL!,
    to,
    subject,
    text,
    html: html ?? text,
  })
}
