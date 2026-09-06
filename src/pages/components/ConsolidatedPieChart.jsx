import React, { useState } from 'react'
import {
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Scale,
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

// Function to generate an open arc path for outer border brackets & textPaths
function createOuterArcPath(startPercent, endPercent, radius, cx, cy, clockwise = true) {
  // Add small padding to avoid overlapping the exact boundary tips
  const pStart = Math.max(0, startPercent + 0.008)
  const pEnd = Math.min(1, endPercent - 0.008)

  if (pEnd <= pStart) return ''

  const [startX, startY] = getCoordinatesForPercent(pStart - 0.25)
  const [endX, endY] = getCoordinatesForPercent(pEnd - 0.25)

  const sx = cx + radius * startX
  const sy = cy + radius * startY
  const ex = cx + radius * endX
  const ey = cy + radius * endY

  const span = pEnd - pStart
  const largeArcFlag = span > 0.5 ? 1 : 0

  if (clockwise) {
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${ex} ${ey}`
  } else {
    return `M ${ex} ${ey} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${sx} ${sy}`
  }
}

export default function ConsolidatedPieChart({
  categoryTotals = {},
  incomeCategoryTotals = {},
  getCategoryMeta,
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  title = 'Consolidated Income & Expenditures',
}) {
  const [activeHeadKey, setActiveHeadKey] = useState(null)
  const [chartMode, setChartMode] = useState('donut') // 'donut' or 'pie'
  const [filterType, setFilterType] = useState('all') // 'all' | 'income' | 'expense'

  // Build grouped Income and Expenditure heads
  const incomeHeads = []
  Object.entries(incomeCategoryTotals).forEach(([category, amount]) => {
    if (amount > 0) {
      const meta = getCategoryMeta ? getCategoryMeta(category) : { color: '#10b981', icon: TrendingUp }
      incomeHeads.push({
        key: `income-${category}`,
        category,
        type: 'income',
        typeLabel: 'Income',
        amount: Number(amount),
        meta,
        color: meta.color || '#10b981',
        icon: meta.icon || TrendingUp,
      })
    }
  })
  incomeHeads.sort((a, b) => b.amount - a.amount)

  const expenseHeads = []
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    if (amount > 0) {
      const meta = getCategoryMeta ? getCategoryMeta(category) : { color: '#ef4444', icon: TrendingDown }
      expenseHeads.push({
        key: `expense-${category}`,
        category,
        type: 'expense',
        typeLabel: 'Expenditure',
        amount: Number(amount),
        meta,
        color: meta.color || '#ef4444',
        icon: meta.icon || TrendingDown,
      })
    }
  })
  expenseHeads.sort((a, b) => b.amount - a.amount)

  const allHeads = [...incomeHeads, ...expenseHeads]

  // Filter based on user selection
  const filteredHeads = allHeads.filter((h) => {
    if (filterType === 'income') return h.type === 'income'
    if (filterType === 'expense') return h.type === 'expense'
    return true
  })

  const totalFilteredVolume = filteredHeads.reduce((sum, h) => sum + h.amount, 0)

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
            Add income or expenditure transactions to view your consolidated chart.
          </span>
        </div>
      </div>
    )
  }

  // Calculate cumulative slice percentages
  let cumulative = 0
  let incomeStart = 0
  let incomeEnd = 0
  let expenseStart = 0
  let expenseEnd = 0
  let hasIncome = false
  let hasExpense = false

  const slices = filteredHeads.map((head) => {
    const percent = head.amount / totalFilteredVolume
    const startPercent = cumulative
    cumulative += percent
    const endPercent = cumulative

    if (head.type === 'income') {
      if (!hasIncome) {
        incomeStart = startPercent
        hasIncome = true
      }
      incomeEnd = endPercent
    } else if (head.type === 'expense') {
      if (!hasExpense) {
        expenseStart = startPercent
        hasExpense = true
      }
      expenseEnd = endPercent
    }

    return {
      ...head,
      percent,
      percentageFormatted: (percent * 100).toFixed(1),
      startPercent,
      endPercent,
    }
  })

  // Geometry dimensions
  const cx = 130
  const cy = 130
  const outerRadius = 76
  const innerRadius = chartMode === 'donut' ? 48 : 0
  const bracketRadius = 87
  const textRadius = 100

  const activeSlice = activeHeadKey ? slices.find((s) => s.key === activeHeadKey) : null

  // Outer Arc Paths for circling labels & brackets
  const incomeBracketPath = hasIncome
    ? createOuterArcPath(incomeStart, incomeEnd, bracketRadius, cx, cy, true)
    : ''
  const expenseBracketPath = hasExpense
    ? createOuterArcPath(expenseStart, expenseEnd, bracketRadius, cx, cy, true)
    : ''

  // TextPaths - orienting them so text is readable (clockwise on top/right, counter-clockwise if on bottom)
  const incomeMidAngle = (incomeStart + incomeEnd) / 2
  const incomeIsBottom = incomeMidAngle > 0.25 && incomeMidAngle < 0.75
  const incomeTextPath = hasIncome
    ? createOuterArcPath(incomeStart, incomeEnd, textRadius, cx, cy, !incomeIsBottom)
    : ''

  const expenseMidAngle = (expenseStart + expenseEnd) / 2
  const expenseIsBottom = expenseMidAngle > 0.25 && expenseMidAngle < 0.75
  const expenseTextPath = hasExpense
    ? createOuterArcPath(expenseStart, expenseEnd, textRadius, cx, cy, !expenseIsBottom)
    : ''

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
              Expenditures
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
        <div className="consolidated-svg-container outer-labeled-container">
          <svg
            viewBox="0 0 260 260"
            className="consolidated-svg outer-labeled-svg"
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

              {/* Text paths for circling labels */}
              {incomeTextPath && (
                <path id="path-income-circling-text" d={incomeTextPath} fill="none" />
              )}
              {expenseTextPath && (
                <path id="path-expense-circling-text" d={expenseTextPath} fill="none" />
              )}
            </defs>

            {/* Slices of Pie */}
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
                  strokeWidth="2"
                  className={`consolidated-slice ${isHovered ? 'slice-active' : ''}`}
                  onMouseEnter={() => setActiveHeadKey(slice.key)}
                  filter={isHovered ? 'url(#consolidated-all-glow)' : 'none'}
                />
              )
            })}

            {/* Outer Circling Bracket Arcs */}
            {hasIncome && incomeBracketPath && (
              <path
                d={incomeBracketPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="outer-arc-bracket bracket-income"
              />
            )}
            {hasExpense && expenseBracketPath && (
              <path
                d={expenseBracketPath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="outer-arc-bracket bracket-expense"
              />
            )}

            {/* Circling Outside Text Labels: "INCOME" & "EXPENDITURES" */}
            {hasIncome && incomeTextPath && (
              <text className="circling-arc-text text-income">
                <textPath
                  href="#path-income-circling-text"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  ● INCOME
                </textPath>
              </text>
            )}

            {hasExpense && expenseTextPath && (
              <text className="circling-arc-text text-expense">
                <textPath
                  href="#path-expense-circling-text"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  ● EXPENDITURES
                </textPath>
              </text>
            )}
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
                    {activeSlice.typeLabel}
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
                          {slice.typeLabel}
                        </span>
                      </div>
                      <span className="head-pct-label">
                        {slice.percentageFormatted}% of {filterType === 'all' ? 'total flow' : (filterType === 'income' ? 'income' : 'expenditures')}
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
              <span className="summary-bar-label">Expenditures:</span>
              <span className="text-red font-bold">-₹{totalExpense.toFixed(2)}</span>
            </div>
            <div className="summary-bar-divider" />
            <div className="summary-bar-pill">
              <span className="summary-bar-label">Net Balance:</span>
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
