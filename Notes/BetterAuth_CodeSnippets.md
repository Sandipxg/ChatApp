# Better Auth Quick Reference

> A practical reference for MyJournalApp's Better Auth implementation.
>
> Use this file when adding features, debugging authentication issues, or revisiting the project after a long time.

---

# Backend Setup

## Auth Configuration

**File:** `backend/config/auth.js`

```javascript
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

const client = mongoose.connection.getClient();
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),

  emailAndPassword: {
    enabled: true,
  },
});
```

---

## Better Auth Route Registration

**File:** `backend/app.js`

```javascript
import { auth } from "./config/auth.js";
import { toNodeHandler } from "better-auth/node";

app.all(
  "/api/auth/*splat",
  toNodeHandler(auth)
);
```

---

## Authentication Middleware

**File:** `backend/middleware/authMiddleware.js`

```javascript
import { auth } from "../config/auth.js";

export const protect = async (
  req,
  res,
  next
) => {
  try {
    const session =
      await auth.api.getSession({
        headers: req.headers,
      });

    if (!session) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    req.userId = session.user.id;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};
```

---

## Protected Route Example

```javascript
router.get(
  "/journals",
  protect,
  getJournals
);
```

---

# Frontend Setup

## Client Configuration

**File:** `frontend/src/services/auth-client.js`

```javascript
import { createAuthClient }
from "better-auth/react";

export const authClient =
  createAuthClient({
    baseURL:
      import.meta.env.VITE_API_URL,
  });
```

---

## Session Hook

```javascript
const sessionQuery =
  authClient.useSession();

const session =
  sessionQuery?.data;

const user =
  session?.user;
```

---

# Authentication Operations

## Sign Up

```javascript
await authClient.signUp.email({
  email,
  password,
  name,
  username,
});
```

---

## Sign In

```javascript
await authClient.signIn.email({
  email,
  password,
});
```

---

## Sign Out

```javascript
await authClient.signOut();
```

---

## Google Login

```javascript
await authClient.signIn.social({
  provider: "google",
});
```

---

# Session Access

## Get Current Session (Server Side)

```javascript
const session =
  await auth.api.getSession({
    headers: req.headers,
  });
```

---

## Access User ID

```javascript
req.userId =
  session.user.id;
```

---

## Access Logged-in User

```javascript
const user =
  session.user;
```

---

# Environment Variables

```env
BETTER_AUTH_SECRET=

BETTER_AUTH_URL=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=
```

---

# Database Collections

Collections automatically managed by Better Auth:

```text
user
session
account
verification
```

---

# Startup Order (Important)

Better Auth requires MongoDB to be connected before initialization.

## Correct Startup Sequence

```javascript
async function startServer() {

  await connectDb();

  const { default: app } =
    await import("./app.js");

  app.listen(PORT);
}
```

---

# Common Errors & Fixes

## Error

```text
MongoNotConnectedError
```

### Cause

```text
Better Auth initialized before mongoose connected.
```

### Fix

```javascript
await connectDb();

const { default: app } =
  await import("./app.js");
```

---

## Error

```text
Cannot use import statement outside module
```

### Fix

```json
{
  "type": "module"
}
```

---

## Error

```text
Session always null
```

### Check Backend CORS

```javascript
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
```

### Check Frontend Requests

```javascript
fetch(url, {
  credentials: "include",
});
```

---

# Migration Notes

### Replaced

* Custom JWT creation
* Custom JWT verification
* Manual cookie handling
* Google OAuth code exchange
* Manual session synchronization

### Benefits

* Less boilerplate
* Simpler OAuth integration
* Better security defaults
* Reactive session state
* Easier maintenance
* Future support for 2FA
* Future support for Passkeys

---

# Debug Checklist

When authentication breaks, verify:

* [ ] MongoDB is connected before Better Auth initializes
* [ ] `BETTER_AUTH_SECRET` exists
* [ ] `BETTER_AUTH_URL` is correct
* [ ] Google credentials are valid
* [ ] CORS has `credentials: true`
* [ ] Frontend requests include credentials
* [ ] Session collection exists
* [ ] User collection exists
* [ ] Account collection exists
* [ ] Auth route `/api/auth/*splat` is registered
* [ ] `auth.api.getSession()` returns a valid session

---

# Most Useful Snippets

## Get Current User ID

```javascript
const session =
  await auth.api.getSession({
    headers: req.headers,
  });

const userId =
  session.user.id;
```

---

## Protect Any Route

```javascript
router.get(
  "/route",
  protect,
  controller
);
```

---

## React User Session

```javascript
const { data: session } =
  authClient.useSession();

const user =
  session?.user;
```

---

## Google Login

```javascript
await authClient.signIn.social({
  provider: "google",
});
```

---

## Logout

```javascript
await authClient.signOut();
```

---

# Quick Summary

**Before**

* bcrypt
* JWT
* Cookies
* OAuth Logic
* Session Sync
* Custom Middleware

**After**

* Better Auth
* Cookie Sessions
* OAuth Integration
* Session Management
* Security Defaults
* Reactive Client SDK

Less code. Less maintenance. Better developer experience.
