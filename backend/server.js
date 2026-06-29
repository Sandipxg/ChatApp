import 'dotenv/config'
import connectDb from './config/db.js'

const PORT = process.env.PORT || 3000

async function startServer() {
    // 1. Ensure DB connection is active before loading the app and Better Auth config
    await connectDb()

    // 2. Dynamically import app so that mongoose.connection is fully populated
    const { default: app } = await import('./app.js')

    app.listen(PORT, () => console.log(`Journal API running on http://localhost:${PORT}`))
}

startServer().catch((error) => {
    console.error('Failed to start Journal API')
    console.error(error.message)

    if (error.code === 'ECONNREFUSED' && error.syscall === 'querySrv') {
        console.error('MongoDB Atlas SRV DNS lookup was refused.')
        console.error('Try adding MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 to backend/.env, or switch your network DNS to Google/Cloudflare.')
    }

    process.exit(1)
})
