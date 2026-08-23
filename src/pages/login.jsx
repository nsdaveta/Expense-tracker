import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Wallet, User, Mail, Lock, Eye, EyeOff, ArrowRight, PiggyBank, BarChart3, ShieldCheck } from "lucide-react"
import { login, setSession } from "../lib/api"
import "./login.css"

export default function Login() {
  const navigate = useNavigate()
  const [FormData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlechange = (e) => {
    setFormData((pre) => ({
      ...pre,
      [e.target.name]: e.target.value,
    }))
  }

  const handlesubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { token, user } = await login({
        email: FormData.email,
        password: FormData.password,
      })
      setSession(token, user)
      setFormData({ name: "", email: "", password: "" })
      navigate("/")
    } catch (err) {
      window.alert(err.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <title>Expense Tracker-Login</title>
    <div className="login-page">
      {/* Left Visual Banner */}
      <div className="hero-section">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="logo-badge">
            <Wallet className="logo-icon" />
            <span>Expense Tracker</span>
          </div>

          <h1 className="hero-title">
            Take control of your <span className="text-gradient">money story</span>
          </h1>
          <p className="hero-subtitle">
            Track every rupee, spot spending patterns, and watch your savings
            grow — all in one clean, beautifully simple dashboard.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <PiggyBank className="feature-icon" />
              <div>
                <h4>Smarter saving</h4>
                <p>See income vs. expenses at a glance, updated instantly.</p>
              </div>
            </div>
            <div className="feature-item">
              <BarChart3 className="feature-icon" />
              <div>
                <h4>Category insights</h4>
                <p>Know exactly where your money goes each month.</p>
              </div>
            </div>
            <div className="feature-item">
              <ShieldCheck className="feature-icon" />
              <div>
                <h4>Private &amp; secure</h4>
                <p>Your data stays on your device — nothing leaves your browser.</p>
              </div>
            </div>
          </div>

          <div className="hero-preview-card">
            <div className="card-top">
              <span>This month</span>
              <span className="badge-positive">+12.4%</span>
            </div>
            <div className="card-amount">₹24,850.00</div>
            <div className="card-progress">
              <div className="progress-fill" style={{ width: "68%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Card */}
      <div className="form-section">
        <div className="form-card">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue tracking your expenses.</p>
          </div>

          <form onSubmit={handlesubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <div className="input-wrapper">
                <User className="input-icon" />
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={FormData.name}
                  onChange={handlechange}
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
                  value={FormData.email}
                  onChange={handlechange}
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
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={FormData.password}
                  onChange={handlechange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="form-footer">
            <p>
              Don&apos;t have an account? <Link to="/signup">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
