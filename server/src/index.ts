import { config } from './config/index.js'
import app from './app.js'
import { startAutomationWorker } from './services/automationService.js'
import { ensureTables } from './database/ensure-tables.js'

async function bootstrap() {
  try {
    await ensureTables()
  } catch (err) {
    console.error('⚠️ Database schema sync notice:', err)
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`)
    console.log(`Environment: ${config.nodeEnv}`)
    
    // Start automation: polls Google Sheets every minute and sends
    // membership cards to newly registered members automatically
    startAutomationWorker()
  })
}

bootstrap()

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})
