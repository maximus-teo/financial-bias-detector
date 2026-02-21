import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useMemo } from 'react'

export default function PnLTimeline({ trades }) {
    const data = useMemo(() => {
        if (!trades?.length) return []
        let cumulative = 0
        return trades.map((t, i) => {
            cumulative += t.profit_loss
            return {
                idx: i + 1,
                pnl: parseFloat(cumulative.toFixed(2)),
                trade_pl: t.profit_loss,
                timestamp: new Date(t.timestamp).toLocaleDateString(),
            }
        })
    }, [trades])

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const d = payload[0].payload
        return (
            <div style={{
                background: '#1e1e26', border: '1px solid var(--border-strong)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12,
            }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Trade #{d.idx} · {d.timestamp}</div>
                <div style={{ fontWeight: 700, color: d.pnl >= 0 ? 'var(--severity-low)' : 'var(--nbc-red)' }}>
                    Cumulative: {d.pnl >= 0 ? '+' : ''}${d.pnl.toLocaleString('en', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    This trade: {d.trade_pl >= 0 ? '+' : ''}${d.trade_pl.toFixed(2)}
                </div>
            </div>
        )
    }

    return (
        <div className="card" style={{ height: '100%' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Cumulative P&L Timeline</div>
            {data.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}>No data</div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                        <XAxis dataKey="idx" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Trade #', position: 'insideBottomRight', fill: 'var(--text-tertiary)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => `$${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 4" />
                        <Line
                            type="monotone" dataKey="pnl"
                            stroke="var(--chart-primary)"
                            strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--nbc-red)' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
