import React, { useState } from 'react'
import {
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Calendar,
} from 'lucide-react'
import './ExpensePieChart.css'

// Helper function to build SVG arc path
function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent)
  const y = Math.sin(2 * Math.PI * percent)
  return [x, y]
}

// Computes position + rotation for a label near a given percent range.
// 'tangential' makes the label curve along the pie's circumference (used for
// wider slices); 'radial' points the label straight out along the slice's own
// radius line (slanted), which reads better for slices too thin to fit
// tangential text. 'outwardPush' shifts the anchor point further away from
// the pie's center (in world space, along the true radial direction — so
// there's no ambiguity from the label's own rotated/flipped orientation)
// before the label is positioned, so tangential labels clear the colored
// ring instead of straddling it.
function getArcLabelTransform(startPercent, endPercent, radius, cx, cy, orientation = 'tangential', outwardPush = 0) {
  const midPercent = (startPercent + endPercent) / 2
  const [midX, midY] = getCoordinatesForPercent(midPercent - 0.25)
  const rawAngleDeg = ((((midPercent - 0.25) * 360) % 360) + 360) % 360
  const rawRad = (rawAngleDeg * Math.PI) / 180
  const labelX = cx + radius * midX + Math.cos(rawRad) * outwardPush
  const labelY = cy + radius * midY + Math.sin(rawRad) * outwardPush
  // Whether the un-offset radial direction points into the lower half of the
  // circle, in which case we flip the rotation 180° to keep text upright.
  const radialFlipped = rawAngleDeg > 90 && rawAngleDeg < 270
  let angleDeg = rawAngleDeg
  if (orientation === 'tangential') angleDeg += 90
  angleDeg = ((angleDeg % 360) + 360) % 360
  const flipped = angleDeg > 90 && angleDeg < 270
  if (flipped) angleDeg -= 180
  // For radial labels, anchor the text at its base (nearest the pie) so the
  // whole label extends outward from there — never back over the slices.
  // Which side counts as "base" flips along with the rotation above.
  const anchor = orientation === 'radial' ? (radialFlipped ? 'end' : 'start') : 'middle'
  // For tangential labels, "central" baseline plus a guessed offset can still
  // let part of the glyph (especially descenders like 'p'/'g'/'y') dip back
  // toward the ring depending on the font's real metrics. 'hanging' anchors
  // the *top* of the text's own em-box (measured by the browser from the
  // actual font, not a guess) at the point and lets the whole box extend one
  // direction only. Combined with a matching dy shift, the entire glyph
  // — ascenders and descenders alike — is guaranteed to land outward, never
  // back over the ring. Which side counts as "outward" flips with rotation.
  // 'dominant-baseline: hanging' relies on the browser's own font-metric
  // measurement, which turned out inconsistent in practice. 'central' is
  // universally well-supported and predictable, so we use that everywhere
  // and push the label out with a deliberately generous dy — erring on the
  // side of a bit more gap rather than risking the glyph dipping back into
  // the ring. Which direction counts as "outward" flips with rotation.
  const baseline = 'central'
  const dyEm = orientation === 'tangential' ? (flipped ? 1.1 : -1.1) : 0
  return { labelX, labelY, angleDeg, anchor, baseline, dyEm }
}

// Estimates whether a label's text would spill past its own slice's arc
// length (and thus risk overlapping the neighboring slice's label) at a given
// radius/font size, so we only switch to the slanted radial style when it's
// actually needed rather than by a fixed angle cutoff.
function isLabelTooWideForArc(text, spanDeg, radius, fontSize) {
  const arcLength = (spanDeg * Math.PI) / 180 * radius
  const estimatedTextWidth = (text?.length || 0) * fontSize * 0.62
  return estimatedTextWidth > arcLength
}

const TX_LABEL_FONT_SIZE = 7.5

// Figures out how far each label reaches beyond the chart's own viewBox on
// every side, so the card can grow just enough room in each direction — no
// more, no less — instead of clipping labels or leaving excess empty space.
function computeLabelClearance(slices, outerRadius, cx, cy, fontSize, viewBoxSize) {
  let minX = 0
  let maxX = viewBoxSize
  let minY = 0
  let maxY = viewBoxSize
  slices.forEach((slice) => {
    slice.subSlices.forEach((sub) => {
      if (!sub.tx) return
      const spanDeg = (sub.endPercent - sub.startPercent) * 360
      const tangentialRadius = outerRadius + 5
      const isTooWide = isLabelTooWideForArc(sub.tx.title, spanDeg, tangentialRadius, fontSize)
      const orientation = isTooWide ? 'radial' : 'tangential'
      const labelRadius = isTooWide ? outerRadius + 15 : tangentialRadius
      const outwardPush = orientation === 'tangential' ? fontSize * 0.9 : 0
      const { labelX, labelY, angleDeg, anchor } = getArcLabelTransform(
        sub.startPercent,
        sub.endPercent,
        labelRadius,
        cx,
        cy,
        orientation,
        outwardPush
      )
      const textLen = (sub.tx.title?.length || 0) * fontSize * 0.62
      const rad = (angleDeg * Math.PI) / 180
      const dx = Math.cos(rad)
      const dy = Math.sin(rad)
      let x0 = labelX
      let y0 = labelY
      let x1 = labelX
      let y1 = labelY
      if (anchor === 'start') {
        x1 = labelX + dx * textLen
        y1 = labelY + dy * textLen
      } else if (anchor === 'end') {
        x0 = labelX - dx * textLen
        y0 = labelY - dy * textLen
      } else {
        x0 = labelX - (dx * textLen) / 2
        y0 = labelY - (dy * textLen) / 2
        x1 = labelX + (dx * textLen) / 2
        y1 = labelY + (dy * textLen) / 2
      }
      minX = Math.min(minX, x0, x1)
      maxX = Math.max(maxX, x0, x1)
      minY = Math.min(minY, y0, y1)
      maxY = Math.max(maxY, y0, y1)
    })
  })
  // Small buffer for the glyphs' own height/width around the text baseline.
  const buffer = fontSize
  return {
    top: minY < 0 ? -minY + buffer : 0,
    bottom: maxY > viewBoxSize ? maxY - viewBoxSize + buffer : 0,
    left: minX < 0 ? -minX + buffer : 0,
    right: maxX > viewBoxSize ? maxX - viewBoxSize + buffer : 0,
  }
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
  expenses = [],
}) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [activeTxKey, setActiveTxKey] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState({})
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

  const toggleCategoryExpand = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

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

  // Calculate cumulative percentages & attach transactions under each head
  let cumulativePercent = 0
  const slices = categories.map(([category, amount]) => {
    const percent = amount / effectiveTotal
    const startPercent = cumulativePercent
    cumulativePercent += percent
    const meta = getCategoryMeta(category)

    const headTransactions = (expenses || []).filter(
      (tx) => tx.type === type && tx.category === category
    )

    // Split this category's arc into one sub-slice per transaction so the
    // pie visually reflects individual transactions, not just the category total.
    let txCumulative = startPercent
    const subSlices = headTransactions.map((tx, idx) => {
      const txPercent = Number(tx.amount) / effectiveTotal
      const txStartPercent = txCumulative
      txCumulative += txPercent
      return {
        key: `${category}__${tx.id ?? idx}`,
        category,
        meta,
        tx,
        idx,
        percent: txPercent,
        startPercent: txStartPercent,
        endPercent: txCumulative,
      }
    })
    // Snap the last sub-slice's end to the category's precise end to avoid
    // floating-point gaps between category boundaries.
    if (subSlices.length > 0) {
      subSlices[subSlices.length - 1].endPercent = cumulativePercent
    } else {
      // Fallback: no matching transaction records, still render the category as one slice.
      subSlices.push({
        key: `${category}__whole`,
        category,
        meta,
        tx: null,
        idx: 0,
        percent,
        startPercent,
        endPercent: cumulativePercent,
      })
    }

    return {
      category,
      amount,
      percent,
      percentageFormatted: (percent * 100).toFixed(1),
      startPercent,
      endPercent: cumulativePercent,
      meta,
      transactions: headTransactions,
      subSlices,
    }
  })

  const outerRadius = 85
  const innerRadius = chartMode === 'donut' ? 52 : 0
  const cx = 100
  const cy = 100

  const activeTx = activeTxKey
    ? slices.flatMap((s) => s.subSlices).find((sub) => sub.key === activeTxKey)
    : null
  const activeSlice = !activeTx && activeCategory
    ? slices.find((s) => s.category === activeCategory)
    : null

  // Grow the content area's padding on every side to exactly fit the widest
  // labels — stopping right after their last word — instead of a fixed guess
  // or clipping mid-word.
  const svgContainerPx = 260
  const svgViewBoxUnits = 200
  const scale = svgContainerPx / svgViewBoxUnits
  const labelClearance = computeLabelClearance(slices, outerRadius, cx, cy, TX_LABEL_FONT_SIZE, svgViewBoxUnits)
  const contentPadding = {
    paddingTop: `${labelClearance.top * scale}px`,
    paddingBottom: `${labelClearance.bottom * scale}px`,
    paddingLeft: `${labelClearance.left * scale}px`,
    paddingRight: `${labelClearance.right * scale}px`,
  }

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

      <div className="pie-chart-content" style={contentPadding}>
        {/* SVG Container */}
        <div className="pie-svg-container">
          <svg
            viewBox="0 0 200 200"
            className="pie-svg"
            onMouseLeave={() => {
              setActiveCategory(null)
              setActiveTxKey(null)
            }}
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

            {/* Slices — one sub-slice per transaction within each category */}
            {slices.map((slice) =>
              slice.subSlices.map((sub) => {
                const isCategoryHovered = !activeTxKey && activeCategory === slice.category
                const isThisTxHovered = activeTxKey === sub.key
                const isHovered = isCategoryHovered || isThisTxHovered
                const currentOuterRadius = isHovered ? outerRadius + 4 : outerRadius
                const currentInnerRadius = isHovered && innerRadius > 0 ? innerRadius - 2 : innerRadius
                const path = createSlicePath(
                  sub.startPercent,
                  sub.endPercent,
                  currentOuterRadius,
                  currentInnerRadius,
                  cx,
                  cy
                )
                // Vary opacity slightly across a category's own transactions so
                // individual sub-slices stay visually distinguishable.
                const fillOpacity = Math.max(0.55, 1 - sub.idx * 0.12)

                return (
                  <path
                    key={sub.key}
                    d={path}
                    fill={`url(#grad-${type}-${slice.category.replace(/\s+/g, '-')})`}
                    fillOpacity={fillOpacity}
                    stroke="var(--bg-card)"
                    strokeWidth="1.5"
                    className={`pie-slice ${isHovered ? 'slice-active' : ''}`}
                    onMouseEnter={() => {
                      setActiveCategory(slice.category)
                      setActiveTxKey(sub.key)
                    }}
                    filter={isHovered ? `url(#pie-glow-${type})` : 'none'}
                  />
                )
              })
            )}

            {/* Transaction labels along the pie's outer boundary */}
            {slices.map((slice) =>
              slice.subSlices
                .filter((sub) => sub.tx)
                .map((sub) => {
                  const spanDeg = (sub.endPercent - sub.startPercent) * 360
                  const tangentialRadius = outerRadius + 5
                  const isTooWide = isLabelTooWideForArc(sub.tx.title, spanDeg, tangentialRadius, TX_LABEL_FONT_SIZE)
                  const orientation = isTooWide ? 'radial' : 'tangential'
                  const labelRadius = isTooWide ? outerRadius + 15 : tangentialRadius
                  const outwardPush = orientation === 'tangential' ? TX_LABEL_FONT_SIZE * 0.9 : 0
                  const { labelX, labelY, angleDeg, anchor, baseline, dyEm } = getArcLabelTransform(
                    sub.startPercent,
                    sub.endPercent,
                    labelRadius,
                    cx,
                    cy,
                    orientation,
                    outwardPush
                  )
                  return (
                    <g
                      key={`label-${sub.key}`}
                      transform={`translate(${labelX}, ${labelY}) rotate(${angleDeg})`}
                    >
                      <text
                        className="tx-arc-label"
                        style={{ fill: sub.meta.color }}
                        textAnchor={anchor}
                        dominantBaseline={baseline}
                        dy={`${dyEm}em`}
                      >
                        {sub.tx.title}
                      </text>
                    </g>
                  )
                })
            )}
          </svg>

          {/* Center Info in Donut Mode */}
          {chartMode === 'donut' && (
            <div className="pie-center-info">
              {activeTx && activeTx.tx ? (
                <>
                  <span className="center-subtitle" style={{ color: activeTx.meta.color }}>
                    {activeTx.tx.title}
                  </span>
                  <span className="center-amount">
                    {isIncome ? '+' : '-'}₹{Number(activeTx.tx.amount).toFixed(2)}
                  </span>
                  <span className="center-pct" style={{ color: activeTx.meta.color }}>
                    {(activeTx.percent * 100).toFixed(1)}%
                  </span>
                  <span className="center-tx-count">{activeTx.tx.date}</span>
                </>
              ) : activeSlice ? (
                <>
                  <span className="center-subtitle" style={{ color: activeSlice.meta.color }}>
                    {activeSlice.category}
                  </span>
                  <span className="center-amount">
                    {isIncome ? '+' : '-'}₹{activeSlice.amount.toFixed(2)}
                  </span>
                  <span className="center-pct" style={{ color: activeSlice.meta.color }}>
                    {activeSlice.percentageFormatted}%
                  </span>
                  <span className="center-tx-count">
                    {activeSlice.transactions.length} {activeSlice.transactions.length === 1 ? 'transaction' : 'transactions'}
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

        {/* Legend with Nested Transactions List */}
        <div className="pie-legend-container">
          <div className="pie-legend-list">
            {slices.map((slice) => {
              const Icon = slice.meta.icon
              const isHovered = activeCategory === slice.category
              const isExpanded = !!expandedCategories[slice.category]

              return (
                <div
                  key={slice.category}
                  className={`pie-legend-card ${isHovered ? 'legend-item-active' : ''} ${isExpanded ? 'card-expanded' : ''}`}
                  onMouseEnter={() => {
                    setActiveCategory(slice.category)
                    setActiveTxKey(null)
                  }}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {/* Card Header Row */}
                  <div
                    className="legend-card-header"
                    onClick={() => toggleCategoryExpand(slice.category)}
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
                        <span className="legend-pct-label">
                          {slice.percentageFormatted}% · {slice.transactions.length} {slice.transactions.length === 1 ? 'tx' : 'txs'}
                        </span>
                      </div>
                    </div>

                    <div className="legend-item-right-wrapper">
                      <div className="legend-item-right">
                        <span className="legend-amount">
                          {isIncome ? '+' : '-'}₹{slice.amount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="expand-tx-btn"
                        title={isExpanded ? 'Hide transactions' : 'Show transactions'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCategoryExpand(slice.category)
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Transactions Drawer */}
                  {isExpanded && (
                    <div className="head-transactions-drawer">
                      <div className="drawer-header-label">Transactions under {slice.category}:</div>
                      {slice.transactions.length === 0 ? (
                        <div className="drawer-empty">No transaction details available</div>
                      ) : (
                        <div className="drawer-tx-list">
                          {slice.transactions.map((tx) => (
                            <div key={tx.id || `${tx.title}-${tx.date}-${tx.amount}`} className="drawer-tx-row">
                              <div className="drawer-tx-left">
                                <span className="drawer-tx-title">{tx.title}</span>
                                <div className="drawer-tx-meta">
                                  <span className="meta-tag date-tag">
                                    <Calendar size={10} />
                                    {tx.date}
                                  </span>
                                  <span className="meta-tag method-tag">
                                    {tx.paymentMethod === 'bank' ? (
                                      <>
                                        <CreditCard size={10} />
                                        Online {tx.bankName ? `(${tx.bankName})` : ''}
                                      </>
                                    ) : (
                                      <>
                                        <Banknote size={10} />
                                        Cash
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="drawer-tx-right">
                                <span className={`drawer-tx-amount ${isIncome ? 'text-green' : 'text-red'}`}>
                                  {isIncome ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
