import express from 'express'
import multer from 'multer'
import authMiddleware from '../middleware/auth.js'
import { uploadToCloudinary } from '../services/cloudinary.js'
import { User } from '../models/userModel.js'
import AppError from '../utils/AppError.js'

const router = express.Router()

// Setup Multer memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new AppError('Only image files are allowed!', 400), false)
    }
  }
})

router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Please select a file to upload.', 400)
    }

    // Upload to Cloudinary (returns secure URL or fallback placeholder URL)
    const imageUrl = await uploadToCloudinary(req.file.buffer)

    // Update User record in Database
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { image: imageUrl },
      { new: true }
    )

    if (!updatedUser) {
      throw new AppError('User not found', 404)
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      image: updatedUser.image,
    })
  } catch (error) {
    next(error)
  }
})

// Phase 13 E2EE: Upload public key JWK for current user
router.put('/public-key', authMiddleware, async (req, res, next) => {
  try {
    const { publicKey } = req.body
    if (!publicKey) {
      throw new AppError('PublicKey object is required', 400)
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { publicKey },
      { new: true }
    )

    res.json({
      success: true,
      publicKey: updatedUser.publicKey
    })
  } catch (error) {
    next(error)
  }
})

// Phase 14 / Explore: Search users by username, name, or email
router.get('/search', authMiddleware, async (req, res, next) => {
  try {
    const query = req.query.q ? req.query.q.trim().replace(/^@/, '') : ''
    if (!query) {
      return res.json([])
    }

    // Import isUserOnline dynamically to prevent circular dependencies
    const { isUserOnline } = await import('../services/socketService.js')

    const matchingUsers = await User.find({
      _id: { $ne: req.userId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('email name image username lastSeen publicKey').limit(20)

    const results = matchingUsers.map((user) => ({
      id: user._id.toString(),
      name: user.name || '',
      email: user.email,
      image: user.image,
      username: user.username || user.name || 'user',
      isOnline: isUserOnline(user._id.toString()),
      lastSeen: user.lastSeen,
      publicKey: user.publicKey || null,
    }))

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// Phase 14 / Settings: Update unique username for authenticated user
router.put('/username', authMiddleware, async (req, res, next) => {
  try {
    let { username } = req.body
    if (!username || typeof username !== 'string') {
      throw new AppError('Username is required.', 400)
    }

    username = username.trim().toLowerCase().replace(/^@/, '')

    // Validate format: 3-20 chars, alphanumeric + underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      throw new AppError('Username must be 3-20 characters long and contain only letters, numbers, or underscores.', 400)
    }

    // Check if taken by another user
    const existing = await User.findOne({ username, _id: { $ne: req.userId } })
    if (existing) {
      throw new AppError('That username is already taken. Please try another.', 400)
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { username },
      { new: true }
    )

    res.json({
      success: true,
      message: 'Username updated successfully',
      username: updatedUser.username,
    })
  } catch (error) {
    next(error)
  }
})

// Phase 13 E2EE: Fetch public key JWK for a specific partner user
router.get('/:userId/public-key', authMiddleware, async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId).select('publicKey username name')
    if (!targetUser) {
      throw new AppError('User not found', 404)
    }

    res.json({
      success: true,
      userId: targetUser._id.toString(),
      publicKey: targetUser.publicKey || null
    })
  } catch (error) {
    next(error)
  }
})

export default router
