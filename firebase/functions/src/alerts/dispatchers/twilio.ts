// Twilio SMS dispatcher. Reads credentials lazily so local tests and non-SMS
// code paths never require the env vars to be set. Only fires when the alert
// is critical AND the recipient has a phoneNumber on their user doc.

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface TwilioDispatchInput {
  to: string;
  body: string;
}

export interface TwilioClientLike {
  messages: {
    create: (opts: { to: string; from: string; body: string }) => Promise<{ sid: string }>;
  };
}

export type TwilioClientFactory = (cfg: TwilioConfig) => TwilioClientLike;

function readEnvConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

// Default factory requires `twilio` as a runtime dependency. Tests inject
// a stub so ts-jest doesn't need to resolve the real SDK.
const defaultFactory: TwilioClientFactory = (cfg) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio');
  return twilio(cfg.accountSid, cfg.authToken);
};

export async function dispatchTwilio(
  input: TwilioDispatchInput,
  factory: TwilioClientFactory = defaultFactory,
  config: TwilioConfig | null = readEnvConfig()
): Promise<{ sid: string } | null> {
  if (!config) return null;
  const client = factory(config);
  const res = await client.messages.create({
    to: input.to,
    from: config.fromNumber,
    body: input.body,
  });
  return { sid: res.sid };
}
