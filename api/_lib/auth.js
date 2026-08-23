import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

function requireSecret() {
  if (!JWT_SECRET) {
    throw new Error(
      'Missing JWT_SECRET. Add JWT_SECRET in Vercel → Project → Settings → Environment Variables.'
    )
  }
}

export function signToken(payload) {
  requireSecret()
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  requireSecret()
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// Pulls and verifies the "Authorization: Bearer <token>" header from a
// Vercel serverless request. Returns the decoded payload or null.
export function getUserFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return null
  return verifyToken(token)
}
