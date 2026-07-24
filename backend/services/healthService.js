import mongoose from 'mongoose'

/**
 * Service function to retrieve database connection state and process uptime.
 */
export async function getSystemHealth() {
  const dbState = mongoose.connection.readyState
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected'

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus
  }
}
