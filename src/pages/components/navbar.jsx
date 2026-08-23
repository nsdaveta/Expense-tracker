import { NavLink } from 'react-router-dom'
import './navbar.css'
import { Wallet } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="top-navbar">
      <div className="nav-brand">
        <Wallet className="nav-icon" size={20} />
        <span>Expense Tracker</span>
      </div>
      <div className="nav-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          end
        >
          Home
        </NavLink>
        <NavLink 
          to="/login" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Login
        </NavLink>
        <NavLink 
          to="/signup" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          Signup
        </NavLink>
      </div>
    </nav>
  )
}
