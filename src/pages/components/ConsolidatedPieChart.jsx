import React, { useState } from 'react'
import {
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
} from 'lucide-react'
import './ConsolidatedPieChart.css'

function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent)
  const y = Math.sin(2 * Math.PI * percent)
  return [x, y]
}

function createSlicePath(startPercent, endPercent, outerRadius, innerRadius, cx, cy) {
  const isFullCircle = endPercent - startPercent >= 0.9999

  if (isFullCircle) {
    if (innerRadius > 0) {
      return `
        M ${cx} ${cy - outerRadius}
        A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy + outerRadius}
        A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy - outerRadius}
        M ${cx} ${cy - innerRadius}
        A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy + innerRadius}
        A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy - innerRadius}
        Z
      `.trim()
    } else {
      return `
        M ${cx} ${cy - outerRadius}
        A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy + outerRadius}
        A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy - outerRadius}
        Z
      `.trim()
    }
  }

  const [startX, startY] = getCoordinatesForPercent(startPercent - 0.25)
  const [endX, endY] = getCoordinatesForPercent(endPercent - 0.25)

  const outerStartX = cx + outerRadius * startX
  const outerStartY = cy + outerRadius * startY
  const outerEndX = cx + outerRadius * endX
  const outerEndY = cy + outerRadius * endY

  const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0

  if (innerRadius > 0) {
    const innerStartX = cx + innerRadius * startX
    const innerStartY = cy + innerRadius * startY
    const innerEndX = cx + innerRadius * endX
    const innerEndY = cy + innerRadius * endY

    return `
      M ${outerStartX} ${outerStartY}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}
      Z
    `.trim()
  } else {
    return `
      M ${cx} ${cy}
      L ${outerStartX} ${outerStartY}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY}
      Z
    `.trim()
  }
}

export default function ConsolidatedPieChart({
  categoryTotals = {},
  incomeCategoryTotals = {},
  getCategoryMeta,
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  title = 'Consolidated Income & Expense Heads',
}) {
  const [activeHeadKey, setActiveHeadKey] = useState(null)
  const [chartMode, setChartMode] = useState('donut') // 'donut' or 'pie'
  const [filterType, setFilterType] = useState('all') // 'all' | 'income' | 'expense'

  // Build all heads
  const allHeads = []

  // Add Income heads
  Object.entries(incomeCategoryTotals).forEach(([category, amount]) => {
    if (amount > 0) {
      const meta = getCategoryMeta ? getCategoryMeta(category) : { color: '#10b981', icon: TrendingUp }
      allHeads.push({
        key: `income-${category}`,
        category,
        type: 'income',
        amount: Number(amount),
        meta,
        color: meta.color || '#10b981',
        icon: meta.icon || TrendingUp,
      })
    }
  })

  // Add Expense heads
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    if (amount > 0) {
      const meta = getCategoryMeta ? getCategoryMeta(category) : { color: '#ef4444', icon: TrendingDown }
      allHeads.push({
        key: `expense-${category}`,
        category,
        type: 'expense',
        amount: Number(amount),
        meta,
        color: meta.color || '#ef4444',
        icon: meta.icon || TrendingDown,
      })
    }
  })

  // Filter based on user selection
  const filteredHeads = allHeads.filter((h) => {
    if (filterType === 'income') return h.type === 'income'
    if (filterType === 'expense') return h.type === 'expense'
    return true
  })

  const totalFilteredVolume = filteredHeads.reduce((sum, h) => sum + h.amount, 0)
  const grandCashFlow = totalIncome + totalExpense

  if (allHeads.length === 0 || totalFilteredVolume === 0) {
    return (
      <div className="consolidated-card empty-card">
        <div className="consolidated-header">
          <div className="consolidated-header-title">
            <div className="consolidated-icon-badge">
              <Scale size={16} />
            </div>
            <span className="section-title">{title}</span>
          </div>
        </div>
        <div className="consolidated-empty-state">
          <div className="empty-chart-placeholder">
            <PieIcon size={38} className="empty-chart-icon" />
          </div>
          <p className="empty-msg">No transactions recorded yet.</p>
          <span className="empty-subtext">
            Add income or expense transactions to view your consolidated heads distribution chart.
          </span>
        </div>
      </div>
    )
  }

  // Calculate cumulative slice percentages
  let cumulative = 0
  const slices = filteredHeads.map((head) => {
    const percent = head.amount / totalFilteredVolume
    const startPercent = cumulative
    cumulative += percent

    return {
      ...head,
      percent,
      percentageFormatted: (percent * 100).toFixed(1),
      startPercent,
      endPercent: cumulative,
    }
  })

  const outerRadius = 85
  const innerRadius = chartMode === 'donut' ? 52 : 0
  const cx = 100
  const cy = 100

  const activeSlice = activeHeadKey ? slices.find((s) => s.key === activeHeadKey) : null

  return (
    <div className="consolidated-card">
      <div className="consolidated-header">
        <div className="consolidated-header-title">
          <div className="consolidated-icon-badge">
            <Scale size={16} />
          </div>
          <span className="section-title">{title}</span>
        </div>

        <div className="consolidated-controls">
          {/* Filter Type Pills */}
          <div className="head-filter-toggle">
            <button
              type="button"
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('all')
                setActiveHeadKey(null)
              }}
            >
              All Heads ({allHeads.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'income' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('income')
                setActiveHeadKey(null)
              }}
            >
              Income
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'expense' ? 'active' : ''}`}
              onClick={() => {
                setFilterType('expense')
                setActiveHeadKey(null)
              }}
            >
              Expenses
            </button>
          </div>

          {/* Chart Mode Toggle */}
          <div className="chart-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${chartMode === 'donut' ? 'active' : ''}`}
              onClick={() => setChartMode('donut')}
              title="Donut Chart"
            >
              Donut
            </button>
            <button
              type="button"
              className={`mode-btn ${chartMode === 'pie' ? 'active' : ''}`}
              onClick={() => setChartMode('pie')}
              title="Pie Chart"
            >
              Pie
            </button>
          </div>
        </div>
      </div>

      <div className="consolidated-content">
        {/* SVG Container */}
        <div className="consolidated-svg-container">
          <svg
            viewBox="0 0 200 200"
            className="consolidated-svg"
            onMouseLeave={() => setActiveHeadKey(null)}
          >
            <defs>
              <filter id="consolidated-all-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {slices.map((slice) => (
                <linearGradient
                  key={`grad-head-${slice.key}`}
                  id={`grad-head-${slice.key.replace(/\s+/g, '-')}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={slice.color} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={slice.color} stopOpacity="0.75" />
                </linearGradient>
              ))}
            </defs>

            {slices.map((slice) => {
              const isHovered = activeHeadKey === slice.key
              const currentOuterRadius = isHovered ? outerRadius + 4 : outerRadius
              const currentInnerRadius = isHovered && innerRadius > 0 ? innerRadius - 2 : innerRadius
              const path = createSlicePath(
                slice.startPercent,
                slice.endPercent,
                currentOuterRadius,
                currentInnerRadius,
                cx,
                cy
              )

              return (
                <path
                  key={slice.key}
                  d={path}
                  fill={`url(#grad-head-${slice.key.replace(/\s+/g, '-')})`}
                  stroke="var(--bg-card)"
                  strokeWidth="2.5"
                  className={`consolidated-slice ${isHovered ? 'slice-active' : ''}`}
                  onMouseEnter={() => setActiveHeadKey(slice.key)}
                  filter={isHovered ? 'url(#consolidated-all-glow)' : 'none'}
                />
              )
            })}
          </svg>

          {/* Center Info in Donut Mode */}
          {chartMode === 'donut' && (
            <div className="consolidated-center-info">
              {activeSlice ? (
                <>
                  <span className="center-subtitle" style={{ color: activeSlice.color }}>
                    {activeSlice.category}
                  </span>
                  <span className={`center-type-tag ${activeSlice.type === 'income' ? 'tag-income' : 'tag-expense'}`}>
                    {activeSlice.type === 'income' ? 'Income Head' : 'Expense Head'}
                  </span>
                  <span className="center-amount">
                    {activeSlice.type === 'income' ? '+' : '-'}₹{activeSlice.amount.toFixed(2)}
                  </span>
                  <span className="center-pct" style={{ color: activeSlice.color }}>
                    {activeSlice.percentageFormatted}%
                  </span>
                </>
              ) : (
                <>
                  <span className="center-subtitle">Net Balance</span>
                  <span className={`center-amount ${netBalance >= 0 ? 'text-green' : 'text-red'}`}>
                    ₹{netBalance.toFixed(2)}
                  </span>
                  <span className="center-flow-count">
                    {slices.length} {slices.length === 1 ? 'Head' : 'Total Heads'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend & All Heads List */}
        <div className="consolidated-details-container">
          <div className="consolidated-heads-grid">
            {slices.map((slice) => {
              const Icon = slice.icon
              const isHovered = activeHeadKey === slice.key

              return (
                <div
                  key={slice.key}
                  className={`consolidated-head-item ${isHovered ? 'head-item-active' : ''}`}
                  onMouseEnter={() => setActiveHeadKey(slice.key)}
                  onMouseLeave={() => setActiveHeadKey(null)}
                >
                  <div className="head-item-left">
                    <span
                      className="legend-icon-badge"
                      style={{
                        backgroundColor: `${slice.color}25`,
                        color: slice.color,
                        borderColor: isHovered ? slice.color : 'transparent',
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="head-item-meta">
                      <div className="head-item-title-row">
                        <span className="head-category-name">{slice.category}</span>
                        <span className={`head-type-pill ${slice.type === 'income' ? 'pill-income' : 'pill-expense'}`}>
                          {slice.type}
                        </span>
                      </div>
                      <span className="head-pct-label">
                        {slice.percentageFormatted}% of {filterType === 'all' ? 'total volume' : filterType}
                      </span>
                    </div>
                  </div>
                  <div className="head-item-right">
                    <span className={`head-amount ${slice.type === 'income' ? 'text-green' : 'text-red'}`}>
                      {slice.type === 'income' ? '+' : '-'}₹{slice.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Summary Row */}
          <div className="consolidated-summary-bar">
            <div className="summary-bar-pill">
              <span className="summary-bar-label">Income:</span>
              <span className="text-green font-bold">+₹{totalIncome.toFixed(2)}</span>
            </div>
            <div className="summary-bar-divider" />
            <div className="summary-bar-pill">
              <span className="summary-bar-label">Expenses:</span>
              <span className="text-red font-bold">-₹{totalExpense.toFixed(2)}</span>
            </div>
            <div className="summary-bar-divider" />
            <div className="summary-bar-pill">
              <span className="summary-bar-label">Net:</span>
              <span className={`${netBalance >= 0 ? 'text-green' : 'text-red'} font-bold`}>
                ₹{netBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
