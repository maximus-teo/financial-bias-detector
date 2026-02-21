import { useMemo } from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TradingHeatmap({ trades }) {
    const matrix = useMemo(() => {
        // 7 days x 24 hours
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0))
        if (!trades?.length) return { grid, max: 1 }

        trades.forEach(t => {
            const d = new Date(t.timestamp)
            const day = d.getDay()  // 0=Sun 6=Sat
            const hour = d.getHours()
            grid[day][hour]++
        })

        let max = 1
        grid.forEach(row => row.forEach(v => { if (v > max) max = v }))
        return { grid, max }
    }, [trades])

    const { grid, max } = matrix

    const getColor = (count) => {
        if (count === 0) return 'var(--bg-primary)'
        const intensity = count / max
        // interpolate from dim to bright red
        const alpha = 0.15 + intensity * 0.75
        return `rgba(228, 28, 35, ${alpha})`
    }

    return (
        <div className="card">
            <div className="section-label" style={{ marginBottom: 16 }}>Trading Activity Heatmap — Hour × Day</div>
            <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 2, minWidth: 600 }}>
                    {/* Header row: hours */}
                    <div />
                    {HOURS.map(h => (
                        <div key={h} style={{
                            textAlign: 'center', fontSize: 9,
                            color: 'var(--text-tertiary)', paddingBottom: 4,
                            fontFeatureSettings: '"tnum"',
                        }}>
                            {h}
                        </div>
                    ))}

                    {/* Data rows: days */}
                    {DAYS.map((day, di) => (
                        <>
                            <div key={`d${di}`} style={{
                                display: 'flex', alignItems: 'center', fontSize: 10,
                                color: 'var(--text-secondary)', paddingRight: 6,
                            }}>
                                {day}
                            </div>
                            {HOURS.map(h => {
                                const count = grid[di][h]
                                return (
                                    <div
                                        key={`${di}-${h}`}
                                        title={`${day} ${h}:00 — ${count} trade${count !== 1 ? 's' : ''}`}
                                        style={{
                                            height: 20, borderRadius: 3,
                                            background: getColor(count),
                                            border: count > 0 ? '1px solid rgba(228,28,35,0.2)' : '1px solid var(--bg-card)',
                                            transition: 'filter 0.1s',
                                            cursor: count > 0 ? 'pointer' : 'default',
                                        }}
                                        onMouseEnter={e => { if (count > 0) e.target.style.filter = 'brightness(1.3)' }}
                                        onMouseLeave={e => { e.target.style.filter = 'none' }}
                                    />
                                )
                            })}
                        </>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Low</span>
                {[0.15, 0.35, 0.55, 0.75, 0.9].map(a => (
                    <div key={a} style={{
                        width: 14, height: 14, borderRadius: 2,
                        background: `rgba(228,28,35,${a})`,
                    }} />
                ))}
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>High</span>
            </div>
        </div>
    )
}
