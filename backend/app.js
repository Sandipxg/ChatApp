import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { createRequire } from 'module'
import { toNodeHandler } from 'better-auth/node'

import { auth } from './config/auth.js'
import * as authController from './controllers/authController.js'
import authMiddleware from './middleware/auth.js'
import pushRoutes from './routes/push.js'
import chatRoutes from './routes/chat.js'
import userRoutes from './routes/user.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// Since swagger.json is a JSON file, using createRequire is the standard ESM way to import JSON
const require = createRequire(import.meta.url)
const swaggerDocument = require('./swagger/swagger.json')

// Global limiter — all routes: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: true,   // sends RateLimit-* headers to client
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

// Auth limiter — login/signup only: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' }
})

const app = express()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
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

app.use('/api/push', pushRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/user', userRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
