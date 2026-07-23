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
