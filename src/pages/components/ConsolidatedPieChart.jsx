import React, { useState } from 'react'
import {
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Calendar,
} from 'lucide-react'
import './ConsolidatedPieChart.css'

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
  // For tangential labels, "central" baseline centers the text exactly on
  // the anchor point, so half the glyph would sit toward the ring by
  // default. 'dominant-baseline: hanging' (an alternative that anchors just
  // the top of the em-box) turned out to rely on inconsistent browser
  // font-metric measurement in practice, so we stick with the reliable
  // 'central' baseline everywhere and instead push the label out with a
  // deliberately generous dy — erring on the side of a bit more gap rather
  // than risking the glyph dipping back into the ring. Which direction
  // counts as "outward" flips along with the rotation above.
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

const TX_LABEL_FONT_SIZE = 7
// How far the transaction label's anchor point sits beyond the pie's own
// edge, before the outward push/hanging-baseline nudge. Shared by every
// place that positions a tangential label, and by the ring radius formula
// below, so they can never drift out of sync with each other.
const TX_TANGENTIAL_OFFSET = 4

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
      const tangentialRadius = outerRadius + TX_TANGENTIAL_OFFSET
      const isTooWide = isLabelTooWideForArc(sub.tx.title, spanDeg, tangentialRadius, fontSize)
      const orientation = isTooWide ? 'radial' : 'tangential'
      const labelRadius = isTooWide ? outerRadius + 42 : tangentialRadius
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

// Function to generate an open arc path for outer border brackets
function createOuterArcPath(startPercent, endPercent, radius, cx, cy) {
  const pStart = Math.max(0, startPercent + 0.006)
  const pEnd = Math.min(1, endPercent - 0.006)

  if (pEnd <= pStart) return ''

  const [startX, startY] = getCoordinatesForPercent(pStart - 0.25)
  const [endX, endY] = getCoordinatesForPercent(pEnd - 0.25)

  const sx = cx + radius * startX
  const sy = cy + radius * startY
  const ex = cx + radius * endX
  const ey = cy + radius * endY

  const span = pEnd - pStart
  const largeArcFlag = span > 0.5 ? 1 : 0

  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${ex} ${ey}`
}

export default function ConsolidatedPieChart({
  categoryTotals = {},
  incomeCategoryTotals = {},
  getCategoryMeta,
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  title = 'Consolidated Income & Expenditures',
  expenses = [],
}) {
  const [activeHeadKey, setActiveHeadKey] = useState(null)
  const [activeTxKey, setActiveTxKey] = useState(null)
  const [expandedHeads, setExpandedHeads] = useState({})
  const [chartMode, setChartMode] = useState('donut') // 'donut' or 'pie'
  const [filterType, setFilterType] = useState('all') // 'all' | 'income' | 'expense'

  const toggleHeadExpand = (key) => {
    setExpandedHeads((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Build grouped Income and Expenditure heads with their corresponding transactions
  const incomeHeads = []
  Object.entries(incomeCategoryTotals).forEach(([category, amount]) => {
    if (amount > 0) {
      const meta = getCategoryMeta ? getCategoryMeta(category) : { color: '#10b981', icon: TrendingUp }
      const headTxs = (expenses || []).filter(
        (tx) => tx.type === 'income' && tx.category === category
      )
      incomeHeads.push({
        key: `income-${category}`,
        category,
        type: 'income',
        typeLabel: 'Income',
        amount: Number(amount),
        meta,
        color: meta.color || '#10b981',
        icon: meta.icon || TrendingUp,
        transactions: headTxs,
      })
    }
  })
  incomeHeads.sort((a, b) => b.amount - a.amount)

  const expenseHeads = []
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    if (amount > 0) {
      const meta = getCategoryMeta ? getCategoryMeta(category) : { color: '#ef4444', icon: TrendingDown }
      const headTxs = (expenses || []).filter(
        (tx) => tx.type === 'expense' && tx.category === category
      )
      expenseHeads.push({
        key: `expense-${category}`,
        category,
        type: 'expense',
        typeLabel: 'Expenditure',
        amount: Number(amount),
        meta,
        color: meta.color || '#ef4444',
        icon: meta.icon || TrendingDown,
        transactions: headTxs,
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

    // Split this head's arc into one sub-slice per transaction so the pie
    // visually reflects individual transactions, not just the head total.
    let txCumulative = startPercent
    const subSlices = head.transactions.map((tx, idx) => {
      const txPercent = Number(tx.amount) / totalFilteredVolume
      const txStartPercent = txCumulative
      txCumulative += txPercent
      return {
        key: `${head.key}__${tx.id ?? idx}`,
        headKey: head.key,
        color: head.color,
        tx,
        idx,
        percent: txPercent,
        startPercent: txStartPercent,
        endPercent: txCumulative,
      }
    })
    if (subSlices.length > 0) {
      subSlices[subSlices.length - 1].endPercent = endPercent
    } else {
      // Fallback: no matching transaction records, still render the head as one slice.
      subSlices.push({
        key: `${head.key}__whole`,
        headKey: head.key,
        color: head.color,
        tx: null,
        idx: 0,
        percent,
        startPercent,
        endPercent,
      })
    }

    return {
      ...head,
      percent,
      percentageFormatted: (percent * 100).toFixed(1),
      startPercent,
      endPercent,
      subSlices,
    }
  })

  // Geometry dimensions matching Expense/Income charts exactly
  const cx = 140
  const cy = 140
  const outerRadius = 94
  const innerRadius = chartMode === 'donut' ? 57 : 0
  const bracketRadius = (() => {
    // How far a tangential label's own glyphs reach past its anchor point:
    // the "outwardPush" world-space shift (matches the label rendering)
    // plus the generous dy nudge used for the same labels (see dyEm above),
    // which is the main thing now doing the work of clearing the ring.
    const outwardPush = TX_LABEL_FONT_SIZE * 0.9
    const dyNudgeReach = TX_LABEL_FONT_SIZE * 1.1
    const tangentialLabelReach = outerRadius + TX_TANGENTIAL_OFFSET + outwardPush + dyNudgeReach
    const safetyGap = 4
    return tangentialLabelReach + safetyGap
  })()
  const textRadius = bracketRadius + 14

  const activeTx = activeTxKey
    ? slices.flatMap((s) => s.subSlices).find((sub) => sub.key === activeTxKey)
    : null
  const activeSlice = !activeTx && activeHeadKey
    ? slices.find((s) => s.key === activeHeadKey)
    : null

  // Outer Arc Paths for circling brackets
  const incomeBracketPath = hasIncome
    ? createOuterArcPath(incomeStart, incomeEnd, bracketRadius, cx, cy)
    : ''
  const expenseBracketPath = hasExpense
    ? createOuterArcPath(expenseStart, expenseEnd, bracketRadius, cx, cy)
    : ''

  // Midpoint angle calculation for reliable, unclipped outer labels
  const incomeMidPercent = (incomeStart + incomeEnd) / 2
  const [incomeMidX, incomeMidY] = getCoordinatesForPercent(incomeMidPercent - 0.25)
  const incomeLabelX = cx + textRadius * incomeMidX
  const incomeLabelY = cy + textRadius * incomeMidY
  let incomeAngleDeg = ((incomeMidPercent - 0.25) * 360) + 90
  if (incomeAngleDeg > 90 && incomeAngleDeg < 270) {
    incomeAngleDeg -= 180
  }

  const expenseMidPercent = (expenseStart + expenseEnd) / 2
  const [expenseMidX, expenseMidY] = getCoordinatesForPercent(expenseMidPercent - 0.25)
  const expenseLabelX = cx + textRadius * expenseMidX
  const expenseLabelY = cy + textRadius * expenseMidY
  let expenseAngleDeg = ((expenseMidPercent - 0.25) * 360) + 90
  if (expenseAngleDeg > 90 && expenseAngleDeg < 270) {
    expenseAngleDeg -= 180
  }

  // Grow the content area's top padding to exactly fit the widest label —
  // stopping right after its last word — instead of a fixed guess or clipping.
  const svgContainerPx = 320
  const svgViewBoxUnits = 280
  const scale = svgContainerPx / svgViewBoxUnits
  const labelClearance = computeLabelClearance(slices, outerRadius, cx, cy, TX_LABEL_FONT_SIZE, svgViewBoxUnits)
  const contentPadding = {
    paddingTop: `${labelClearance.top * scale}px`,
    paddingBottom: `${labelClearance.bottom * scale}px`,
    paddingLeft: `${labelClearance.left * scale}px`,
    paddingRight: `${labelClearance.right * scale}px`,
  }

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

      <div className="consolidated-content" style={contentPadding}>
        {/* SVG Container */}
        <div className="consolidated-svg-container outer-labeled-container">
          <svg
            viewBox="0 0 280 280"
            className="consolidated-svg outer-labeled-svg"
            onMouseLeave={() => {
              setActiveHeadKey(null)
              setActiveTxKey(null)
            }}
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

            {/* Slices of Pie — one sub-slice per transaction within each head */}
            {slices.map((slice) =>
              slice.subSlices.map((sub) => {
                const isHeadHovered = !activeTxKey && activeHeadKey === slice.key
                const isThisTxHovered = activeTxKey === sub.key
                const isHovered = isHeadHovered || isThisTxHovered
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
                const fillOpacity = Math.max(0.55, 1 - sub.idx * 0.12)

                return (
                  <path
                    key={sub.key}
                    d={path}
                    fill={`url(#grad-head-${slice.key.replace(/\s+/g, '-')})`}
                    fillOpacity={fillOpacity}
                    stroke="var(--bg-card)"
                    strokeWidth="1.5"
                    className={`consolidated-slice ${isHovered ? 'slice-active' : ''}`}
                    onMouseEnter={() => {
                      setActiveHeadKey(slice.key)
                      setActiveTxKey(sub.key)
                    }}
                    filter={isHovered ? 'url(#consolidated-all-glow)' : 'none'}
                  />
                )
              })
            )}

            {/* Transaction labels along the pie's outer boundary, below the INCOME/EXPENDITURES ring */}
            {slices.map((slice) =>
              slice.subSlices
                .filter((sub) => sub.tx)
                .map((sub) => {
                  const spanDeg = (sub.endPercent - sub.startPercent) * 360
                  const tangentialRadius = outerRadius + TX_TANGENTIAL_OFFSET
                  const isTooWide = isLabelTooWideForArc(sub.tx.title, spanDeg, tangentialRadius, TX_LABEL_FONT_SIZE)
                  const orientation = isTooWide ? 'radial' : 'tangential'
                  const labelRadius = isTooWide ? outerRadius + 42 : tangentialRadius
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
                        style={{ fill: sub.color }}
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
            {hasIncome && (
              <g transform={`translate(${incomeLabelX}, ${incomeLabelY}) rotate(${incomeAngleDeg})`}>
                <text
                  className="circling-arc-text text-income"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  ● INCOME
                </text>
              </g>
            )}

            {hasExpense && (
              <g transform={`translate(${expenseLabelX}, ${expenseLabelY}) rotate(${expenseAngleDeg})`}>
                <text
                  className="circling-arc-text text-expense"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  ● EXPENDITURES
                </text>
              </g>
            )}
          </svg>

          {/* Center Info in Donut Mode */}
          {chartMode === 'donut' && (
            <div className="consolidated-center-info">
              {activeTx && activeTx.tx ? (
                <>
                  <span className="center-subtitle" style={{ color: activeTx.color }}>
                    {activeTx.tx.title}
                  </span>
                  <span className="center-amount">
                    {activeTx.tx.type === 'income' ? '+' : '-'}₹{Number(activeTx.tx.amount).toFixed(2)}
                  </span>
                  <span className="center-pct" style={{ color: activeTx.color }}>
                    {(activeTx.percent * 100).toFixed(1)}%
                  </span>
                  <span className="center-tx-count">{activeTx.tx.date}</span>
                </>
              ) : activeSlice ? (
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
                  <span className="center-tx-count">
                    {activeSlice.transactions.length} {activeSlice.transactions.length === 1 ? 'transaction' : 'transactions'}
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

        {/* Legend & All Heads with Nested Transactions List */}
        <div className="consolidated-details-container">
          <div className="consolidated-heads-grid">
            {slices.map((slice) => {
              const Icon = slice.icon
              const isHovered = activeHeadKey === slice.key
              const isExpanded = !!expandedHeads[slice.key]

              return (
                <div
                  key={slice.key}
                  className={`consolidated-head-card ${isHovered ? 'head-item-active' : ''} ${isExpanded ? 'card-expanded' : ''}`}
                  onMouseEnter={() => {
                    setActiveHeadKey(slice.key)
                    setActiveTxKey(null)
                  }}
                  onMouseLeave={() => setActiveHeadKey(null)}
                >
                  {/* Card Header Row */}
                  <div
                    className="consolidated-head-header"
                    onClick={() => toggleHeadExpand(slice.key)}
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
                          {slice.percentageFormatted}% · {slice.transactions.length} {slice.transactions.length === 1 ? 'tx' : 'txs'}
                        </span>
                      </div>
                    </div>

                    <div className="head-item-right-wrapper">
                      <div className="head-item-right">
                        <span className={`head-amount ${slice.type === 'income' ? 'text-green' : 'text-red'}`}>
                          {slice.type === 'income' ? '+' : '-'}₹{slice.amount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="expand-tx-btn"
                        title={isExpanded ? 'Hide transactions' : 'Show transactions'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleHeadExpand(slice.key)
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
                                <span className={`drawer-tx-amount ${slice.type === 'income' ? 'text-green' : 'text-red'}`}>
                                  {slice.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
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
