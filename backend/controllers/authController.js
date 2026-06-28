import * as authService from '../services/authService.js'
import AppError from '../utils/AppError.js'

export async function deleteAccount(req, res) {
  const { password } = req.body
  const userId = req.userId
  if (!password) {
    throw new AppError('password required', 400)
  }

  const result = await authService.deleteAccount(userId, password, req.headers)
  res.json(result)
}

export async function updateReminder(req, res) {
  const { reminderTime, timezone } = req.body
  const userId = req.userId

  // Validate reminderTime if provided
  if (reminderTime !== null && typeof reminderTime === 'string') {
    const timeRegex = /^\d{2}:\d{2}$/
    if (!timeRegex.test(reminderTime)) {
      throw new AppError('Invalid reminder time format. Expected HH:MM or null', 400)
    }
  }

  // Validate timezone if provided
  if (timezone && typeof timezone === 'string') {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
    } catch (err) {
      throw new AppError('Invalid timezone identifier', 400)
    }
  }

  const updatedUser = await authService.updateReminder(
    userId,
    reminderTime || null,
    timezone || 'UTC'
  )

  res.json(updatedUser)
}

