import { OAuth2Client } from 'google-auth-library';

export function makeGoogleClient(callbackPath: string): OAuth2Client {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${base}${callbackPath}`,
  );
}
