import mongoose from "mongoose";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";

// Extract client and db synchronously
const client = mongoose.connection.getClient();
const db = client.db();

const rawFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : ''

const isHttps = process.env.BETTER_AUTH_URL?.startsWith('https') || process.env.NODE_ENV === 'production'

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60 // 30 days

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db, {
    client,
    // Using Better Auth's default singular collection names: user, session, account
  }),
  session: {
    expiresIn: THIRTY_DAYS_IN_SECONDS,
    updateAge: 24 * 60 * 60, // Refresh session token once per day
    cookieCache: {
      enabled: true,
      maxAge: THIRTY_DAYS_IN_SECONDS
    }
  },
  advanced: {
    useSecureCookies: isHttps,
    defaultCookieAttributes: {
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
      maxAge: THIRTY_DAYS_IN_SECONDS,
    },
  },

  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username()
  ],
  user: {
    additionalFields: {
      reminderTime: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      timezone: {
        type: "string",
        required: false,
        defaultValue: "UTC",
      }
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  },
  trustedOrigins: Array.from(new Set([
    "http://localhost:5173",
    "http://localhost:4173",
    "https://chat-app-gold-kappa-51.vercel.app",
    "https://*.vercel.app",
    rawFrontendUrl,
    process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : ''
  ].filter(Boolean)))

});
