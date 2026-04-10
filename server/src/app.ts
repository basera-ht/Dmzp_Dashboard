import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config/index.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/index.js'
import { rateLimiter } from './middleware/rateLimiter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  crossOriginEmbedderPolicy: false,
}))

// CORS: allow the configured origin, or all origins in non-production
const corsOrigin = config.cors.origin
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}))

app.use(morgan('combined'))
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))

app.use((req, _res, next) => {
  req.requestTime = new Date().toISOString()
  next()
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

app.use(rateLimiter)
app.use('/api', routes)

// Fallback for missing API routes
app.use('/api/*', notFoundHandler)

app.use(errorHandler)

export default app
