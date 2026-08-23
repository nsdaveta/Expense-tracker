import { MongoClient } from 'mongodb'

// Accept a couple of common env var names so this keeps working no matter
// how the Mongo connection was wired up in Vercel (manual env var or the
// MongoDB Atlas Vercel integration, which may name it differently).
const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL

const DB_NAME = process.env.MONGODB_DB || 'expense_tracker'

let cachedClient = null
let cachedDb = null

export async function connectToDatabase() {
  if (cachedDb) return cachedDb

  if (!uri) {
    throw new Error(
      'Missing MongoDB connection string. Add MONGODB_URI in Vercel → Project → Settings → Environment Variables.'
    )
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }

  cachedDb = cachedClient.db(DB_NAME)
  return cachedDb
}
