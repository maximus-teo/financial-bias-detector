import { motion } from 'framer-motion'

const PROFILE_COLORS = {
    Conservative: 'var(--severity-low)',
    Moderate: 'var(--severity-medium)',
    Aggressive: 'var(--nbc-red)',
}

export default function RiskProfileBadge({ report }) {
    if (!report) return null

    const { risk_profile, summary_stats, top_recommendation } = report
    const profileColor = PROFILE_COLORS[risk_profile.profile] || 'var(--text-primary)'

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(228,28,35,0.06) 100%)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '20px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                flexWrap: 'wrap',
            }}
        >
            {/* Profile name */}
            <div style={{ minWidth: 180 }}>
                <div className="section-label" style={{ marginBottom: 6 }}>Risk Profile</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: profileColor, lineHeight: 1 }}>
                        {risk_profile.profile}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                        {risk_profile.score}/100
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 48, background: 'var(--border)', flexShrink: 0 }} />

            {/* Stats */}
            <div style={{ display: 'flex', gap: 28, flex: 1 }}>
                {[
                    { label: 'Total Trades', value: report.trade_count, format: v => v.toLocaleString() },
                    { label: 'Win Rate', value: summary_stats.win_rate, format: v => `${(v * 100).toFixed(1)}%` },
                    { label: 'Total P&L', value: summary_stats.total_pnl, format: v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    { label: 'Avg P&L', value: summary_stats.avg_pnl, format: v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}` },
                ].map(({ label, value, format }) => {
                    const isNeg = typeof value === 'number' && value < 0 && label.includes('P&L')
                    const isPos = typeof value === 'number' && value > 0 && label.includes('P&L')
                    return (
                        <div key={label}>
                            <div className="section-label" style={{ marginBottom: 4 }}>{label}</div>
                            <div style={{
                                fontSize: 18, fontWeight: 700,
                                fontFeatureSettings: '"tnum"',
                                color: isNeg ? 'var(--nbc-red)' : isPos ? 'var(--severity-low)' : 'var(--text-primary)',
                            }}>
                                {format(value)}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 48, background: 'var(--border)', flexShrink: 0 }} />

            {/* Top recommendation */}
            {top_recommendation && (
                <div style={{ maxWidth: 280 }}>
                    <div className="section-label" style={{ marginBottom: 6 }}>Top Priority</div>
                    <div style={{ fontSize: 12, color: '#6e8efb', lineHeight: 1.5 }}>{top_recommendation}</div>
                </div>
            )}
        </motion.div>
    )
}
