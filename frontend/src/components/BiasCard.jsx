import { motion } from 'framer-motion'

const BIAS_LABELS = {
    overtrading: 'Overtrading',
    loss_aversion: 'Loss Aversion',
    revenge_trading: 'Revenge Trading',
}

function CircleGauge({ score, severity }) {
    const colors = {
        low: 'var(--severity-low)',
        medium: 'var(--severity-medium)',
        high: 'var(--nbc-red)',
    }
    const safeSeverity = (severity || 'low').toLowerCase()
    const color = colors[safeSeverity] || colors.low
    const r = 36
    const circ = 2 * Math.PI * r
    const pct = Math.min(1, Math.max(0, score))

    return (
        <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
            <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
                <motion.circle
                    cx="44" cy="44" r={r} fill="none"
                    stroke={color} strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ * (1 - pct) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <motion.span
                    style={{ fontSize: 20, fontWeight: 700, color, fontFeatureSettings: '"tnum"', lineHeight: 1 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    {Math.round(pct * 100)}
                </motion.span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', lineHeight: 1 }}>/100</span>
            </div>
        </div>
    )
}

export default function BiasCard({ bias, index = 0 }) {
    const severityLower = (bias.severity || 'low').toLowerCase()
    const pillClass = `pill-${severityLower}`
    const isHigh = severityLower === 'high'

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            style={{
                borderLeft: isHigh ? '3px solid var(--nbc-red)' : '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 14,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {isHigh && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'var(--nbc-red-glow)',
                }} />
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-label">{BIAS_LABELS[bias.bias] || bias.bias}</span>
                <motion.span
                    className={pillClass}
                    animate={isHigh ? { opacity: [1, 0.6, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {bias.severity}
                </motion.span>
            </div>

            {/* Score gauge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CircleGauge score={bias.score} severity={bias.severity} />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {bias.summary}
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                <motion.div
                    style={{
                        height: '100%', borderRadius: 4,
                        background: severityLower === 'high' ? 'var(--nbc-red)'
                            : severityLower === 'medium' ? 'var(--severity-medium)'
                                : 'var(--severity-low)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${bias.score * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </div>

            {/* Signals */}
            {bias.signals?.filter(s => s.triggered).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div className="section-label" style={{ marginBottom: 2 }}>Triggered Signals</div>
                    {bias.signals.filter(s => s.triggered).map((sig, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                    background: severityLower === 'high' ? 'var(--nbc-red)'
                                        : severityLower === 'medium' ? 'var(--severity-medium)'
                                            : 'var(--severity-low)',
                                }} />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sig.label}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFeatureSettings: '"tnum"', flexShrink: 0 }}>
                                {typeof sig.value === 'number' ? sig.value.toLocaleString() : sig.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Recommendations */}
            {bias.recommendations?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="section-label" style={{ marginBottom: 2 }}>Recommendations</div>
                    {bias.recommendations.slice(0, 2).map((rec, i) => (
                        <div key={i} style={{
                            borderLeft: '2px solid var(--chart-secondary)',
                            paddingLeft: 10,
                            background: 'rgba(110,142,251,0.05)',
                            borderRadius: '0 6px 6px 0',
                            padding: '7px 10px 7px 10px',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                        }}>
                            {rec.text}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}
