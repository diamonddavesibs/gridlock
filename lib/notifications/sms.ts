import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export interface SmsPayload {
  to: string
  body: string
}

export async function sendSms({ to, body }: SmsPayload): Promise<void> {
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
    body,
  })
}
