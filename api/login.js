import bcrypt from 'bcryptjs'
import { connectToDatabase } from './_lib/db.js'
import { signToken } from './_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const db = await connectToDatabase()
    const users = db.collection('users')

    const user = await users.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    })

    return res.status(200).json({
      token,
      user: { name: user.name, email: user.email },
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
