import { v2 as cloudinary } from 'cloudinary'

// Initialize only if keys are present
const isConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

export async function uploadToCloudinary(fileBuffer, folder = 'chatapp-avatars') {
  if (!isConfigured) {
    console.warn('Cloudinary not configured. Falling back to mock upload.')
    // Return a beautiful dynamic placeholder image based on initials or random color
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 300, height: 300, crop: 'limit' }],
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result.secure_url)
      }
    )
    uploadStream.end(fileBuffer)
  })
}

export async function uploadChatMediaToCloudinary(fileBuffer, mimeType) {
  const isVideo = mimeType.startsWith('video/')

  if (!isConfigured) {
    console.warn('Cloudinary not configured. Falling back to mock chat media upload.')
    if (isVideo) {
      // A reliable public sample video for local development
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    } else {
      // A random stable image for local development
      return `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/800/600`
    }
  }

  return new Promise((resolve, reject) => {
    const options = {
      folder: 'chatapp-media',
      resource_type: isVideo ? 'video' : 'image',
    }

    // Keep aspect ratio but limit extreme resolutions to save bandwidth
    if (!isVideo) {
      options.transformation = [{ width: 1200, height: 1200, crop: 'limit' }]
    }

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error)
      resolve(result.secure_url)
    })
    
    uploadStream.end(fileBuffer)
  })
}

