import mongoose from "mongoose";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";

// Extract client and db synchronously
const client = mongoose.connection.getClient();
const db = client.db();

const rawFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : ''

const isHttps = process.env.BETTER_AUTH_URL?.startsWith('https') || process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db, {
    client,
    // Using Better Auth's default singular collection names: user, session, account
  }),
  account: {
    storeStateStrategy: "database",
  },
  advanced: {
    useSecureCookies: isHttps,
    defaultCookieAttributes: isHttps ? {
      sameSite: "none",
      secure: true,
    } : {},
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
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:4173",
    rawFrontendUrl,
    process.env.FRONTEND_URL,
    "https://*.vercel.app"
  ].filter(Boolean)

});

