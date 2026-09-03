import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || "",
  jwt: {
    secret: process.env.JWT_SECRET || "resqpatient-super-secret-jwt-key-2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "resqpatient-super-secret-refresh-key-2026",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_resqpatient_mock_key_2026",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_resqpatient_webhook_secret",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "resqpatient-google-client-id.apps.googleusercontent.com",
  },
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
};
