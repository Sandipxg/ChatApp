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

export default router
