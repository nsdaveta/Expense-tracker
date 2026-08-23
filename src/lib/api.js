// Thin client for talking to our Vercel Serverless Functions under /api.
// The session (JWT + display info) is cached in localStorage purely so the
// browser remembers "who's logged in" without re-prompting — the actual
// source of truth for accounts and transactions is MongoDB, reachable from
// any device that logs in with the right email/password.

const TOKEN_KEY = 'et_auth_token'
const USER_KEY = 'et_auth_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn() {
  return Boolean(getToken() && getStoredUser())
}

async function request(path, options = {}) {
  const token = getToken()

  let res
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) clearSession()
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }

  return data
}

export function signup({ name, email, password }) {
  return request('/api/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function login({ email, password }) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchTransactions() {
  return request('/api/transactions', { method: 'GET' })
}

export function createTransaction(payload) {
  return request('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteTransaction(id) {
  return request(`/api/transactions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
