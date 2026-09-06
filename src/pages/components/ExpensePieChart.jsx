import React, { useState } from 'react'
import {
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import './ExpensePieChart.css'

// Helper function to build SVG arc path
function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent)
  const y = Math.sin(2 * Math.PI * percent)
  return [x, y]
}

function createSlicePath(startPercent, endPercent, outerRadius, innerRadius, cx, cy) {
  const isFullCircle = endPercent - startPercent >= 0.9999
  
  if (isFullCircle) {
    if (innerRadius > 0) {
      // Donut full circle
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
      // Full pie circle
      return `
        M ${cx} ${cy - outerRadius}
        A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy + outerRadius}
        A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy - outerRadius}
        Z
      `.trim()
    }
  }

  // Adjust coordinate start from top (-0.25 offset for 12 o'clock)
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

export default function ExpensePieChart({
  categoryTotals = {},
  getCategoryMeta,
  totalExpense,
  totalAmount,
  type = 'expense', // 'expense' | 'income'
  title,
}) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [chartMode, setChartMode] = useState('donut') // 'donut' or 'pie'

  const isIncome = type === 'income'
  const defaultTitle = isIncome ? 'Income Sources Breakdown' : 'Expense Heads Breakdown'
  const displayTitle = title || defaultTitle

  const categories = Object.entries(categoryTotals)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])

  const effectiveTotal = totalAmount !== undefined
    ? totalAmount
    : (totalExpense !== undefined ? totalExpense : categories.reduce((sum, [_, amt]) => sum + amt, 0))

  const HeaderIcon = isIncome ? TrendingUp : TrendingDown

  if (categories.length === 0 || effectiveTotal === 0) {
    return (
      <div className="pie-chart-card empty-card">
        <div className="pie-chart-header">
          <div className="pie-header-title">
            <div className={`pie-icon-badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
              <HeaderIcon size={16} />
            </div>
            <span className="section-title">{displayTitle}</span>
          </div>
        </div>
        <div className="pie-empty-state">
          <div className="empty-chart-placeholder">
            <PieIcon size={38} className="empty-chart-icon" />
          </div>
          <p className="empty-msg">
            {isIncome ? 'No income transactions recorded yet.' : 'No expense transactions recorded yet.'}
          </p>
          <span className="empty-subtext">
            {isIncome
              ? 'Add income to view your income sources distribution chart.'
              : 'Add an expense to view your expense heads distribution chart.'}
          </span>
        </div>
      </div>
    )
  }

  // Calculate cumulative percentages
  let cumulativePercent = 0
  const slices = categories.map(([category, amount]) => {
    const percent = amount / effectiveTotal
    const startPercent = cumulativePercent
    cumulativePercent += percent
    const meta = getCategoryMeta(category)

    return {
      category,
      amount,
      percent,
      percentageFormatted: (percent * 100).toFixed(1),
      startPercent,
      endPercent: cumulativePercent,
      meta,
    }
  })

  const outerRadius = 85
  const innerRadius = chartMode === 'donut' ? 52 : 0
  const cx = 100
  const cy = 100

  const activeSlice = activeCategory ? slices.find((s) => s.category === activeCategory) : null

  return (
    <div className="pie-chart-card">
      <div className="pie-chart-header">
        <div className="pie-header-title">
          <div className={`pie-icon-badge ${isIncome ? 'badge-income' : 'badge-expense'}`}>
            <HeaderIcon size={16} />
          </div>
          <span className="section-title">{displayTitle}</span>
        </div>
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

      <div className="pie-chart-content">
        {/* SVG Container */}
        <div className="pie-svg-container">
          <svg
            viewBox="0 0 200 200"
            className="pie-svg"
            onMouseLeave={() => setActiveCategory(null)}
          >
            <defs>
              <filter id={`pie-glow-${type}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {slices.map((slice) => (
                <linearGradient
                  key={`grad-${type}-${slice.category}`}
                  id={`grad-${type}-${slice.category.replace(/\s+/g, '-')}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={slice.meta.color} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={slice.meta.color} stopOpacity="0.75" />
                </linearGradient>
              ))}
            </defs>

            {/* Slices */}
            {slices.map((slice) => {
              const isHovered = activeCategory === slice.category
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
                  key={slice.category}
                  d={path}
                  fill={`url(#grad-${type}-${slice.category.replace(/\s+/g, '-')})`}
                  stroke="var(--bg-card)"
                  strokeWidth="2.5"
                  className={`pie-slice ${isHovered ? 'slice-active' : ''}`}
                  onMouseEnter={() => setActiveCategory(slice.category)}
                  filter={isHovered ? `url(#pie-glow-${type})` : 'none'}
                />
              )
            })}
          </svg>

          {/* Center Info in Donut Mode */}
          {chartMode === 'donut' && (
            <div className="pie-center-info">
              {activeSlice ? (
                <>
                  <span className="center-subtitle" style={{ color: activeSlice.meta.color }}>
                    {activeSlice.category}
                  </span>
                  <span className="center-amount">₹{activeSlice.amount.toFixed(2)}</span>
                  <span className="center-pct" style={{ color: activeSlice.meta.color }}>
                    {activeSlice.percentageFormatted}%
                  </span>
                </>
              ) : (
                <>
                  <span className="center-subtitle">{isIncome ? 'Total Income' : 'Total Spent'}</span>
                  <span className={`center-amount ${isIncome ? 'text-green' : ''}`}>
                    {isIncome ? '+' : ''}₹{effectiveTotal.toFixed(2)}
                  </span>
                  <span className="center-heads-count">
                    {slices.length} {isIncome ? (slices.length === 1 ? 'Source' : 'Sources') : (slices.length === 1 ? 'Head' : 'Heads')}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend and breakdown details */}
        <div className="pie-legend-container">
          <div className="pie-legend-list">
            {slices.map((slice) => {
              const Icon = slice.meta.icon
              const isHovered = activeCategory === slice.category

              return (
                <div
                  key={slice.category}
                  className={`pie-legend-item ${isHovered ? 'legend-item-active' : ''}`}
                  onMouseEnter={() => setActiveCategory(slice.category)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <div className="legend-item-left">
                    <span
                      className="legend-icon-badge"
                      style={{
                        backgroundColor: `${slice.meta.color}25`,
                        color: slice.meta.color,
                        borderColor: isHovered ? slice.meta.color : 'transparent',
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="legend-item-labels">
                      <span className="legend-category-name">{slice.category}</span>
                      <span className="legend-pct-label">{slice.percentageFormatted}% of total</span>
                    </div>
                  </div>
                  <div className="legend-item-right">
                    <span className="legend-amount">₹{slice.amount.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
