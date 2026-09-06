import React, { useState } from 'react'
import {
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Wallet,
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

export default function ConsolidatedPieChart({
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  title = 'Consolidated Cash Flow (Income vs Expenses)',
}) {
  const [activeSegment, setActiveSegment] = useState(null)
  const [chartMode, setChartMode] = useState('donut') // 'donut' or 'pie'

  const totalVolume = totalIncome + totalExpense

  if (totalVolume === 0) {
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
          <p className="empty-msg">No income or expense data available yet.</p>
          <span className="empty-subtext">
            Add transactions to view your consolidated income vs expense breakdown.
          </span>
        </div>
      </div>
    )
  }

  const segments = []
  let cumulative = 0

  if (totalIncome > 0) {
    const pct = totalIncome / totalVolume
    segments.push({
      id: 'income',
      label: 'Total Income',
      amount: totalIncome,
      color: '#10b981',
      icon: TrendingUp,
      percent: pct,
      percentageFormatted: (pct * 100).toFixed(1),
      startPercent: cumulative,
      endPercent: cumulative + pct,
    })
    cumulative += pct
  }

  if (totalExpense > 0) {
    const pct = totalExpense / totalVolume
    segments.push({
      id: 'expense',
      label: 'Total Expenses',
      amount: totalExpense,
      color: '#ef4444',
      icon: TrendingDown,
      percent: pct,
      percentageFormatted: (pct * 100).toFixed(1),
      startPercent: cumulative,
      endPercent: cumulative + pct,
    })
    cumulative += pct
  }

  const outerRadius = 85
  const innerRadius = chartMode === 'donut' ? 52 : 0
  const cx = 100
  const cy = 100

  const active = activeSegment ? segments.find((s) => s.id === activeSegment) : null

  // Savings rate calculation
  const savingsRate = totalIncome > 0 && netBalance >= 0
    ? ((netBalance / totalIncome) * 100).toFixed(0)
    : null

  return (
    <div className="consolidated-card">
      <div className="consolidated-header">
        <div className="consolidated-header-title">
          <div className="consolidated-icon-badge">
            <Scale size={16} />
          </div>
          <span className="section-title">{title}</span>
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

      <div className="consolidated-content">
        {/* SVG Container */}
        <div className="consolidated-svg-container">
          <svg
            viewBox="0 0 200 200"
            className="consolidated-svg"
            onMouseLeave={() => setActiveSegment(null)}
          >
            <defs>
              <filter id="consolidated-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="grad-consolidated-income" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="grad-consolidated-expense" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {segments.map((seg) => {
              const isHovered = activeSegment === seg.id
              const currentOuterRadius = isHovered ? outerRadius + 4 : outerRadius
              const currentInnerRadius = isHovered && innerRadius > 0 ? innerRadius - 2 : innerRadius
              const path = createSlicePath(
                seg.startPercent,
                seg.endPercent,
                currentOuterRadius,
                currentInnerRadius,
                cx,
                cy
              )

              return (
                <path
                  key={seg.id}
                  d={path}
                  fill={`url(#grad-consolidated-${seg.id})`}
                  stroke="var(--bg-card)"
                  strokeWidth="2.5"
                  className={`consolidated-slice ${isHovered ? 'slice-active' : ''}`}
                  onMouseEnter={() => setActiveSegment(seg.id)}
                  filter={isHovered ? 'url(#consolidated-glow)' : 'none'}
                />
              )
            })}
          </svg>

          {/* Center Info in Donut Mode */}
          {chartMode === 'donut' && (
            <div className="consolidated-center-info">
              {active ? (
                <>
                  <span className="center-subtitle" style={{ color: active.color }}>
                    {active.label}
                  </span>
                  <span className="center-amount">
                    {active.id === 'income' ? '+' : '-'}₹{active.amount.toFixed(2)}
                  </span>
                  <span className="center-pct" style={{ color: active.color }}>
                    {active.percentageFormatted}% of flow
                  </span>
                </>
              ) : (
                <>
                  <span className="center-subtitle">Net Balance</span>
                  <span className={`center-amount ${netBalance >= 0 ? 'text-green' : 'text-red'}`}>
                    ₹{netBalance.toFixed(2)}
                  </span>
                  {savingsRate !== null ? (
                    <span className="center-savings text-green">
                      {savingsRate}% Saved
                    </span>
                  ) : (
                    <span className="center-flow-count">
                      ₹{totalVolume.toFixed(2)} Total Flow
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Legend & Key Metrics */}
        <div className="consolidated-details-container">
          <div className="consolidated-legend-list">
            {segments.map((seg) => {
              const Icon = seg.icon
              const isHovered = activeSegment === seg.id

              return (
                <div
                  key={seg.id}
                  className={`consolidated-legend-item ${isHovered ? 'legend-item-active' : ''}`}
                  onMouseEnter={() => setActiveSegment(seg.id)}
                  onMouseLeave={() => setActiveSegment(null)}
                >
                  <div className="legend-item-left">
                    <span
                      className="legend-icon-badge"
                      style={{
                        backgroundColor: `${seg.color}25`,
                        color: seg.color,
                        borderColor: isHovered ? seg.color : 'transparent',
                      }}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="legend-item-labels">
                      <span className="legend-category-name">{seg.label}</span>
                      <span className="legend-pct-label">
                        {seg.percentageFormatted}% of total cashflow
                      </span>
                    </div>
                  </div>
                  <div className="legend-item-right">
                    <span className={`legend-amount ${seg.id === 'income' ? 'text-green' : 'text-red'}`}>
                      {seg.id === 'income' ? '+' : '-'}₹{seg.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Net Balance Status Row */}
            <div className="consolidated-balance-badge">
              <div className="legend-item-left">
                <span className="legend-icon-badge icon-balance">
                  <Wallet size={14} />
                </span>
                <div className="legend-item-labels">
                  <span className="legend-category-name">Net Surplus / Savings</span>
                  <span className="legend-pct-label">
                    {netBalance >= 0 ? 'Positive balance retained' : 'Deficit spending'}
                  </span>
                </div>
              </div>
              <div className="legend-item-right">
                <span className={`legend-amount ${netBalance >= 0 ? 'text-green' : 'text-red'}`}>
                  ₹{netBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
