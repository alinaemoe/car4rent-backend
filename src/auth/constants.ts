import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const jwtConstants = {
  secret: requireEnv('JWT_SECRET'),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
};
