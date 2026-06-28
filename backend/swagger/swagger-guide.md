# Swagger Guide

A reference for understanding and maintaining the Swagger API documentation setup in this project.

---

## What is Swagger?

Swagger is a tool that generates an **interactive web page for your API**. Instead of reading a static Markdown file, you can:

- Browse every endpoint (GET, POST, PUT, DELETE)
- See the expected request body and response format
- Click **"Try it out"** and send real requests directly from the browser

It is built on the **OpenAPI Specification** — an industry-standard format for describing REST APIs using JSON or YAML.

---

## Tools Used in This Project

| Package | Role |
|---|---|
| `swagger-autogen` | Scans your route files and **generates** `swagger.json` automatically |
| `swagger-ui-express` | Reads `swagger.json` and **serves** the interactive UI at `/api-docs` |

---

## Project File Structure

```text
backend/
  swagger/
    swagger.js      ← Generator script (you run this)
    swagger.json    ← Auto-generated output (never edit manually)
  app.js            ← Mounts Swagger UI at /api-docs
  package.json      ← Contains the "swagger" script
```

---

## How to Use

### Step 1 — Start the backend
```bash
npm run dev
```

### Step 2 — Open the Swagger UI
Visit this URL in your browser:
```
http://localhost:3000/api-docs
```

### Step 3 — Regenerate docs (after adding/changing routes)
```bash
npm run swagger
```

> Always run `npm run swagger` after adding a new route or modifying an existing one.
> The `swagger.json` file does **not** update automatically on save.

---

## How the Generator Works

`swagger/swagger.js` calls `swagger-autogen` with three arguments:

```javascript
swaggerAutogen(outputFile, endpointsFiles, doc)
```

| Argument | Value | Purpose |
|---|---|---|
| `outputFile` | `./swagger.json` | Where to write the generated file |
| `endpointsFiles` | `['../app.js']` | Entry point to scan routes from |
| `doc` | `{ info, host, schemes, ... }` | Metadata: title, version, host, security |

`swagger-autogen` follows all `require()` calls from `app.js` through to route files and automatically detects every `router.get(...)`, `router.post(...)`, etc.

---

## How the UI is Served

In `app.js`, two lines wire everything together:

```javascript
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./swagger/swagger.json')

// Serve the interactive docs at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
```

- `swaggerUi.serve` — serves the static CSS/JS assets for the UI
- `swaggerUi.setup(swaggerDocument)` — renders the spec into the interactive page

---

## Authentication in Swagger UI

This project supports two auth methods. Both are defined in `swagger.js` under `securityDefinitions`:

| Name | Type | How it Works |
|---|---|---|
| `cookieAuth` | API Key (cookie) | Browser sends the `jwt` cookie automatically |
| `bearerAuth` | API Key (header) | You paste `Bearer <token>` into the Authorize dialog |

### To test protected routes in Swagger UI:
1. First call `POST /api/auth/login` to get a token.
2. Copy the `token` value from the response.
3. Click the **Authorize** padlock button at the top of the page.
4. Paste your token as: `Bearer eyJhbGci...`
5. Click **Authorize** — all subsequent requests will include the token.

---

## Common Questions

**Q: Can I edit `swagger.json` directly?**  
No. It is auto-generated and will be overwritten the next time you run `npm run swagger`. All configuration belongs in `swagger/swagger.js`.

**Q: Why are my new routes not showing up in the UI?**  
Run `npm run swagger` to regenerate `swagger.json`, then restart the server.

**Q: Can I add descriptions to each endpoint?**  
Yes. Add a comment directly above the route in your route file using `swagger-autogen`'s comment syntax:

```javascript
// #swagger.description = 'Returns all journals for the logged-in user'
router.get('/', journalController.getByUser)
```

Then re-run `npm run swagger`.

**Q: Should I commit `swagger.json` to Git?**  
It is a generated file. You can either:
- ✅ Commit it — so anyone cloning the repo can run the server without needing to regenerate
- 🔄 Add it to `.gitignore` — and document that contributors should run `npm run swagger` after cloning

For a learning project, committing it is simpler.

---

## Quick Reference

```bash
# Generate / update swagger.json
npm run swagger

# Start the backend (includes Swagger UI)
npm run dev

# View interactive docs
open http://localhost:3000/api-docs
```
