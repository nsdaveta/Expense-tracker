import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wallet, User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import './signup.css'

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      window.alert('Passwords do not match. Please check again.')
      return
    }

    if (formData.password.length < 6) {
      window.alert('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    const user = localStorage.getItem('user')
    const email = localStorage.getItem('email')
    const password = localStorage.getItem('password')
    if (JSON.parse(user) === formData.name && JSON.parse(email) === formData.email && JSON.parse(password) === formData.password) {
      window.alert('User Already Exists, Try Logging In instead')
      setLoading(false)
      navigate('/login')
      return
    }
    else{
    localStorage.setItem('user', JSON.stringify(formData.name))
    localStorage.setItem('email', JSON.stringify(formData.email))
    localStorage.setItem('password', JSON.stringify(formData.password))
    setFormData({ name: '', email: '', password: '', confirmPassword: '' })
    window.alert('Registration successful!')
    setLoading(false)
    navigate('/login')
    }
  }

  return (
    <>
    <title>Expense Tracker-Signup</title>
    <div className="signup-page">
      {/* Left Visual Banner */}
      <div className="hero-section">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="logo-badge">
            <Wallet className="logo-icon" />
            <span>Expense Tracker</span>
          </div>

          <h1 className="hero-title">
            Start your <span className="text-gradient">financial glow-up</span> today
          </h1>
          <p className="hero-subtitle">
            Create a free account and get a clear, real-time picture of your
            income, spending, and savings — no spreadsheets required.
          </p>

          <div className="benefit-card">
            <Sparkles className="benefit-icon" />
            <div>
              <h4>Free forever, no fine print</h4>
              <p>Set up your account in under a minute and start logging transactions right away.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Card */}
      <div className="form-section">
        <div className="form-card">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Start tracking your expenses in seconds.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div className="input-wrapper">
                <User className="input-icon" />
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 6 characters password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="form-footer">
            <p>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
