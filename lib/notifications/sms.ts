import twilio from 'twilio'
import { env } from '@/lib/env'

const client = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null

export interface SmsPayload {
  to: string
  body: string
}

export async function sendSms({ to, body }: SmsPayload): Promise<void> {
  if (!client || !env.TWILIO_FROM_NUMBER) return
  await client.messages.create({
    from: env.TWILIO_FROM_NUMBER,
    to,
    body,
  })
}
