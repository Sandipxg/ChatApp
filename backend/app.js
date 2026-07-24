import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import { createRequire } from 'module'
import { toNodeHandler } from 'better-auth/node'

import { auth } from './config/auth.js'
import * as authController from './controllers/authController.js'
import authMiddleware from './middleware/auth.js'
import { sanitizeMiddleware } from './utils/sanitize.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'
import { globalLimiter, authLimiter, mediaUploadLimiter, chatActionLimiter } from './middleware/rateLimiters.js'

import pushRoutes from './routes/push.js'
import chatRoutes from './routes/chat.js'
import userRoutes from './routes/user.js'
import healthRoutes from './routes/health.js'

export { mediaUploadLimiter, chatActionLimiter }

// Since swagger.json is a JSON file, using createRequire is the standard ESM way to import JSON
const require = createRequire(import.meta.url)
const swaggerDocument = require('./swagger/swagger.json')



const app = express()

// Trust reverse proxy (required for Render / Vercel HTTPS cookies and rate limiters)
app.set('trust proxy', 1)

const rawFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : ''

const allowedOrigins = [
  rawFrontendUrl,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean)


app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
      return callback(null, true)
    }
    return callback(null, false)
  },
  credentials: true
}))


// Security headers and rate limiting
app.use(helmet())
app.use(globalLimiter)

// Custom auth endpoints MUST be defined before the Better Auth catch-all handler.
// This allows Express to intercept our custom actions (reminder settings, deleteaccount, etc.)
// and let Better Auth handle the rest (sign-in, sign-up, sign-out, social logins).
app.put('/api/auth/reminder', authLimiter, express.json(), cookieParser(), authMiddleware, authController.updateReminder)
app.delete('/api/auth/deleteaccount', authLimiter, express.json(), cookieParser(), authMiddleware, authController.deleteAccount)

// Mount Better Auth catch-all endpoint.
// We disable parsing of json for this path as Better Auth reads req stream natively.
app.all('/api/auth/*splat', toNodeHandler(auth))

// Root health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Journal API is running' })
})

// Serve interactive Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// Global middlewares for routes mounted below
app.use(express.json())
app.use(cookieParser())
app.use(sanitizeMiddleware)

app.use('/api/push', pushRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/user', userRoutes)
app.use('/api/health', healthRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
