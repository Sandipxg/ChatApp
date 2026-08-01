import 'dotenv/config'
import mongoose from 'mongoose'
import dns from 'dns'

// Set Google DNS servers for Windows SRV DNS resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {}

async function clearAllAccountsAndData() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('Error: MONGODB_URI is missing from backend/.env')
    process.exit(1)
  }

  console.log('Connecting to MongoDB Atlas...')
  await mongoose.connect(mongoUri)
  const db = mongoose.connection.db

  console.log('Clearing all test user accounts, sessions, conversations, and messages...')

  const collections = ['user', 'session', 'account', 'conversation', 'message', 'verification']

  for (const colName of collections) {
    try {
      const col = db.collection(colName)
      const res = await col.deleteMany({})
      console.log(`[Cleared] Collection "${colName}": deleted ${res.deletedCount} documents.`)
    } catch (err) {
      if (err.codeName === 'NamespaceNotFound') {
        console.log(`[Skipped] Collection "${colName}" does not exist yet.`)
      } else {
        console.error(`[Error] Failed to clear collection "${colName}":`, err.message)
      }
    }
  }

  console.log('\n✅ All test accounts and data have been completely purged from MongoDB!')
  await mongoose.disconnect()
  process.exit(0)
}

clearAllAccountsAndData().catch((err) => {
  console.error('Fatal error executing clear script:', err)
  process.exit(1)
})
