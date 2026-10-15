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

const isDev = config.nodeEnv !== 'production'
const devOrigin = isDev && typeof config.cors.origin === 'string' && config.cors.origin.startsWith('http://')
  ? config.cors.origin
  : isDev
  ? 'http://localhost:5173'
  : null

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', ...(devOrigin ? [devOrigin] : [])],
      connectSrc: ["'self'", 'https:', ...(devOrigin ? [devOrigin] : [])],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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

// CORS configuration.
// Security note: credentials:true with origin:'*' is rejected by browsers AND
// is a security risk when combined with a reflective-origin callback.
// When CORS_ORIGIN is '*' (open public API), send the literal wildcard and
// disable credentials so browsers don't expose cookies to arbitrary origins.
// For a specific configured origin, credentials:true is safe and correct.
const corsOrigin = config.cors.origin
const isWildcard = corsOrigin === '*'
const corsOptions: import('cors').CorsOptions = {
  origin: isWildcard ? '*' : corsOrigin,
  credentials: !isWildcard,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  // Allow browsers to cache the preflight response for 2 hours
  maxAge: 7200,
}
app.use(cors(corsOptions))
// Explicitly handle OPTIONS preflight for all routes (mobile & webview browsers
// sometimes send a standalone OPTIONS request that must return 204 immediately)
app.options('*', cors(corsOptions))

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
