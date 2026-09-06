import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  Home as HomeIcon,
  Zap,
  UtensilsCrossed,
  Clapperboard,
  Car,
  Briefcase,
  Laptop,
  Gift,
  LineChart,
  Building2,
  Landmark,
  Undo2,
  MoreHorizontal,
} from 'lucide-react'
import {
  getStoredUser,
  clearSession,
  fetchTransactions,
  createTransaction,
  deleteTransaction,
} from '../lib/api'
import ExpensePieChart from './components/ExpensePieChart'
import './home.css'

// ── category → icon / color mapping ────────────────────────────────────────

const CATEGORY_META = {
  Groceries: { icon: ShoppingCart, color: '#f59e0b' },
  Housing: { icon: HomeIcon, color: '#3b82f6' },
  Utilities: { icon: Zap, color: '#eab308' },
  'Food & Dining': { icon: UtensilsCrossed, color: '#f97316' },
  Entertainment: { icon: Clapperboard, color: '#a855f7' },
  Transport: { icon: Car, color: '#06b6d4' },
  Salary: { icon: Briefcase, color: '#10b981' },
  Freelance: { icon: Laptop, color: '#10b981' },
  Bonus: { icon: Gift, color: '#10b981' },
  Investments: { icon: LineChart, color: '#22c55e' },
  'Rental Income': { icon: Building2, color: '#0ea5e9' },
  Interest: { icon: Landmark, color: '#14b8a6' },
  Refund: { icon: Undo2, color: '#84cc16' },
  Other: { icon: MoreHorizontal, color: '#94a3b8' },
}

function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.Other
}

const EXPENSE_CATEGORIES = ['Groceries', 'Housing', 'Utilities', 'Food & Dining', 'Entertainment', 'Transport', 'Other']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Bonus', 'Investments', 'Rental Income', 'Interest', 'Refund', 'Other']

// Corrects legacy/mismatched entries (e.g. an income transaction saved with
// an expense-only category) by falling back to "Other" for that type.
function sanitizeCategory(item) {
  const validList = item.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return validList.includes(item.category) ? item.category : 'Other'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [user, setUser] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Groceries',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  })

  const navigate = useNavigate()

  useEffect(() => {
    const currentUser = getStoredUser()
    if (!currentUser) {
      navigate('/login')
      return
    }
    setUser(currentUser)

    fetchTransactions()
      .then(({ transactions }) => {
        const cleaned = transactions.map((item) => ({ ...item, category: sanitizeCategory(item) }))
        setExpenses(cleaned)
      })
      .catch((err) => {
        window.alert(err.message || 'Could not load your transactions.')
        if (err.message?.includes('authenticated')) navigate('/login')
      })
  }, [navigate])

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  const handleIfscChange = async (e) => {
    const code = e.target.value.toUpperCase()
    setForm((prev) => ({ ...prev, ifscCode: code }))
    
    if (code.length === 11) {
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${code}`)
        if (res.ok) {
          const data = await res.json()
          setForm((prev) => ({ ...prev, bankName: data.BANK || prev.bankName }))
        }
      } catch (err) {
        console.error('Failed to fetch bank details:', err)
      }
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.amount || parseFloat(form.amount) <= 0) return

    try {
      const { transaction } = await createTransaction(form)
      setExpenses((prev) => [...prev, transaction])
      setForm({
        title: '',
        amount: '',
        category: 'Groceries',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
      })
      setShowAddModal(false)
    } catch (err) {
      window.alert(err.message || 'Could not add transaction. Please try again.')
    }
  }

  const handleDelete = async (id) => {
    const previous = expenses
    setExpenses((prev) => prev.filter((item) => item.id !== id)) // optimistic
    try {
      await deleteTransaction(id)
    } catch (err) {
      setExpenses(previous) // roll back on failure
      window.alert(err.message || 'Could not delete transaction. Please try again.')
    }
  }

  const totalIncome = expenses
    .filter((i) => i.type === 'income')
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const totalExpense = expenses
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + Number(i.amount), 0)

  const netBalance = totalIncome - totalExpense

  // Spending breakdown by category (expenses only)
  const categoryTotals = expenses
    .filter((i) => i.type === 'expense')
    .reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + Number(i.amount)
      return acc
    }, {})

  const maxCategoryTotal = Math.max(0, ...Object.values(categoryTotals))

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  // Income breakdown by category (income only)
  const incomeCategoryTotals = expenses
    .filter((i) => i.type === 'income')
    .reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + Number(i.amount)
      return acc
    }, {})

  const maxIncomeCategoryTotal = Math.max(0, ...Object.values(incomeCategoryTotals))

  const sortedIncomeCategories = Object.entries(incomeCategoryTotals).sort((a, b) => b[1] - a[1])

  if (!user) return null

  return (
    <>
      <title>Expense Tracker-Home</title>
      <div className="home-page">
        <div className="home-shell">

          {/* Hero */}
          <div className="home-hero">
          <div className="home-hero-glow" />
          <div className="home-hero-top">
            <div className="home-brand-badge">
              <Wallet size={16} />
              <span>Expense Tracker</span>
            </div>
            <button className="submit-btn logout-small" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
          <h1 className="home-hero-title">
            Welcome back, <span className="home-text-gradient">{user.name}</span>
          </h1>
          <p className="home-hero-subtitle">
            {netBalance >= 0
              ? "You're in good shape — here's where your money's been going lately."
              : "Here's a clear look at your spending so you can get back on track."}
          </p>
        </div>

        {/* Summary Row */}
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-icon icon-green"><TrendingUp size={16} /></span>
            <span className="summary-label">Income</span>
            <span className="summary-amount text-green">+₹{totalIncome.toFixed(2)}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-icon icon-red"><TrendingDown size={16} /></span>
            <span className="summary-label">Expenses</span>
            <span className="summary-amount text-red">-₹{totalExpense.toFixed(2)}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <span className="summary-icon icon-blue"><Wallet size={16} /></span>
            <span className="summary-label">Balance</span>
            <span className={`summary-amount ${netBalance >= 0 ? 'text-green' : 'text-red'}`}>
              ₹{netBalance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Expense Heads Pie Chart */}
        <ExpensePieChart
          title="Expense Heads Breakdown"
          type="expense"
          categoryTotals={categoryTotals}
          getCategoryMeta={getCategoryMeta}
          totalAmount={totalExpense}
        />

        {/* Income Sources Pie Chart */}
        <ExpensePieChart
          title="Income Sources Breakdown"
          type="income"
          categoryTotals={incomeCategoryTotals}
          getCategoryMeta={getCategoryMeta}
          totalAmount={totalIncome}
        />

        {/* Main dashboard grid */}
        <div className="dashboard-grid">

          {/* Spending Breakdown (side column) */}
          <aside className="dashboard-side">
            <div className="breakdown-card">
              <span className="section-title">Spending by category</span>
              {sortedCategories.length === 0 ? (
                <p className="empty-msg">Add an expense to see your breakdown.</p>
              ) : (
                <div className="breakdown-list">
                  {sortedCategories.map(([category, total]) => {
                    const meta = getCategoryMeta(category)
                    const Icon = meta.icon
                    const pct = maxCategoryTotal ? (total / maxCategoryTotal) * 100 : 0
                    return (
                      <div key={category} className="breakdown-row">
                        <span className="breakdown-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
                          <Icon size={14} />
                        </span>
                        <span className="breakdown-label">{category}</span>
                        <div className="breakdown-bar-track">
                          <div
                            className="breakdown-bar-fill"
                            style={{ width: `${pct}%`, background: meta.color }}
                          />
                        </div>
                        <span className="breakdown-amount">₹{total.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Income Breakdown */}
          <aside className="dashboard-side">
            <div className="breakdown-card">
              <span className="section-title">Income by category</span>
              {sortedIncomeCategories.length === 0 ? (
                <p className="empty-msg">Add income to see your breakdown.</p>
              ) : (
                <div className="breakdown-list">
                  {sortedIncomeCategories.map(([category, total]) => {
                    const meta = getCategoryMeta(category)
                    const Icon = meta.icon
                    const pct = maxIncomeCategoryTotal ? (total / maxIncomeCategoryTotal) * 100 : 0
                    return (
                      <div key={category} className="breakdown-row">
                        <span className="breakdown-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
                          <Icon size={14} />
                        </span>
                        <span className="breakdown-label">{category}</span>
                        <div className="breakdown-bar-track">
                          <div
                            className="breakdown-bar-fill"
                            style={{ width: `${pct}%`, background: meta.color }}
                          />
                        </div>
                        <span className="breakdown-amount">₹{total.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Transactions (main column) */}
          <div className="dashboard-main">
            <div className="section-header">
              <span className="section-title">Transactions</span>
              <button className="submit-btn add-small" onClick={() => setShowAddModal(true)}>
                <Plus size={16} />
                Add
              </button>
            </div>

            <div className="tx-list">
              {expenses.length === 0 ? (
                <p className="empty-msg">No transactions yet. Add one to get started!</p>
              ) : (
                [...expenses].reverse().map((item) => {
                  const meta = getCategoryMeta(item.category)
                  const Icon = meta.icon
                  return (
                    <div key={item.id} className="tx-row">
                      <span className="tx-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
                        <Icon size={16} />
                      </span>
                      <div className="tx-info">
                        <span className="tx-title">{item.title}</span>
                        <span className="tx-meta">
                          {item.category} · {item.date}
                        </span>
                      </div>
                      <div className="tx-right">
                        <span className={`tx-amount ${item.type === 'income' ? 'text-green' : 'text-red'}`}>
                          {item.type === 'income' ? '+' : '-'}₹{Number(item.amount).toFixed(2)}
                        </span>
                        <button className="delete-tx" onClick={() => handleDelete(item.id)} aria-label="Delete transaction">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="form-card" onClick={(e) => e.stopPropagation()}>
            <div className="form-header modal-header">
              <h1>Add Transaction</h1>
              <button className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="auth-form">

              {/* Type Toggle */}
              <div className="type-toggle">
                <button
                  type="button"
                  className={form.type === 'expense' ? 'active expense' : ''}
                  onClick={() => setForm({ ...form, type: 'expense', category: 'Groceries' })}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={form.type === 'income' ? 'active income' : ''}
                  onClick={() => setForm({ ...form, type: 'income', category: 'Salary' })}
                >
                  Income
                </button>
              </div>

              {/* Payment Method Toggle */}
              <div className="type-toggle" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className={form.paymentMethod === 'cash' ? 'active expense' : ''}
                  onClick={() => setForm({ ...form, paymentMethod: 'cash' })}
                  style={{ backgroundColor: form.paymentMethod === 'cash' ? '#555' : 'transparent', color: form.paymentMethod === 'cash' ? '#fff' : 'inherit' }}
                >
                  Offline
                </button>
                <button
                  type="button"
                  className={form.paymentMethod === 'bank' ? 'active income' : ''}
                  onClick={() => setForm({ ...form, paymentMethod: 'bank' })}
                  style={{ backgroundColor: form.paymentMethod === 'bank' ? '#555' : 'transparent', color: form.paymentMethod === 'bank' ? '#fff' : 'inherit' }}
                >
                  Online
                </button>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Title / Description"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {form.type === 'income' ? (
                      <>
                        <option value="Salary">Salary</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Bonus">Bonus</option>
                        <option value="Investments">Investments</option>
                        <option value="Rental Income">Rental Income</option>
                        <option value="Interest">Interest</option>
                        <option value="Refund">Refund</option>
                        <option value="Other">Other</option>
                      </>
                    ) : (
                      <>
                        <option value="Groceries">Groceries</option>
                        <option value="Housing">Housing</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Food & Dining">Food & Dining</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Transport">Transport</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {form.paymentMethod === 'bank' && (
                <>
                  <div className="form-group">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="Bank Name (e.g. HDFC)"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="IFSC Code (Optional)"
                        value={form.ifscCode}
                        onChange={handleIfscChange}
                        maxLength={11}
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="submit-btn">
                Save Transaction
              </button>
              <button type="button" className="cancel-link" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
