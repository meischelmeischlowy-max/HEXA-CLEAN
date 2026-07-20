import { Resend } from "resend";

const DEFAULT_OWNER_EMAIL = "info@hexaclean.ch";
const DEFAULT_EMAIL_FROM = "HEXA CLEAN <notifications@hexaclean.ch>";

type EmailEnvironment = Partial<
  Record<
    | "HEXA_OWNER_EMAIL"
    | "HEXA_EMAIL_FROM"
    | "HEXA_EMAIL_REPLY_TO",
    string
  >
>;

function cleanEnvironmentValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

export function resolveEmailConfiguration(
  environment: EmailEnvironment = process.env as EmailEnvironment,
) {
  const ownerEmail =
    cleanEnvironmentValue(environment.HEXA_OWNER_EMAIL) ??
    DEFAULT_OWNER_EMAIL;

  return {
    ownerEmail,
    from:
      cleanEnvironmentValue(environment.HEXA_EMAIL_FROM) ??
      DEFAULT_EMAIL_FROM,
    replyTo:
      cleanEnvironmentValue(environment.HEXA_EMAIL_REPLY_TO) ?? ownerEmail,
  };
}

export const emailConfiguration = resolveEmailConfiguration();

const resendApiKey = process.env.RESEND_API_KEY?.trim();

export const resend = resendApiKey ? new Resend(resendApiKey) : null;
