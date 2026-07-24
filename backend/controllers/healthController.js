import * as healthService from '../services/healthService.js'

export async function getHealthStatus(req, res, next) {
  try {
    const healthData = await healthService.getSystemHealth()
    res.json(healthData)
  } catch (error) {
    next(error)
  }
}
