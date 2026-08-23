import bcrypt from 'bcryptjs'
import { connectToDatabase } from './_lib/db.js'
import { signToken } from './_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, password } = req.body || {}

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const trimmedName = String(name).trim()

    const db = await connectToDatabase()
    const users = db.collection('users')

    // Ensures no two accounts can ever share an email, even under
    // concurrent signups from different devices.
    await users.createIndex({ email: 1 }, { unique: true })

    const existing = await users.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await users.insertOne({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
    })

    const token = signToken({
      userId: result.insertedId.toString(),
      email: normalizedEmail,
      name: trimmedName,
    })

    return res.status(201).json({
      token,
      user: { name: trimmedName, email: normalizedEmail },
    })
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' })
    }
    console.error('Signup error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
