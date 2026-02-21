import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useMemo } from 'react'

export default function DrawdownChart({ trades }) {
    const data = useMemo(() => {
        if (!trades?.length) return []
        let peak = trades[0]?.balance || 0
        return trades.map((t, i) => {
            if (t.balance > peak) peak = t.balance
            const drawdown = peak > 0 ? ((peak - t.balance) / peak) * 100 : 0
            return {
                idx: i + 1,
                balance: parseFloat(t.balance.toFixed(2)),
                peak: parseFloat(peak.toFixed(2)),
                drawdown: parseFloat(drawdown.toFixed(2)),
                timestamp: new Date(t.timestamp).toLocaleDateString(),
            }
        })
    }, [trades])

    const maxDrawdown = data.length ? Math.max(...data.map(d => d.drawdown)) : 0

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const d = payload[0]?.payload
        return (
            <div style={{
                background: '#1e1e26', border: '1px solid var(--border-strong)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12,
            }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Trade #{d.idx}</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Balance: ${d.balance.toLocaleString()}</div>
                <div style={{ color: d.drawdown > 10 ? 'var(--nbc-red)' : 'var(--severity-medium)' }}>
                    Drawdown: {d.drawdown.toFixed(1)}%
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className="section-label">Balance & Drawdown</span>
                <span style={{ fontSize: 12, color: maxDrawdown > 10 ? 'var(--nbc-red)' : 'var(--severity-medium)' }}>
                    Max drawdown: {maxDrawdown.toFixed(1)}%
                </span>
            </div>
            {data.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}>No data</div>
            ) : (
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                        <defs>
                            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-secondary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--chart-secondary)" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--border)" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="var(--border)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                        <XAxis dataKey="idx" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => `$${v.toLocaleString()}`} />
                        <Tooltip content={<CustomTooltip />} />
                        {/* Peak line */}
                        <Area type="monotone" dataKey="peak" stroke="var(--border-strong)" strokeDasharray="4 4"
                            fill="url(#peakGrad)" strokeWidth={1} dot={false} />
                        {/* Balance line */}
                        <Area type="monotone" dataKey="balance" stroke="var(--chart-secondary)"
                            fill="url(#balanceGrad)" strokeWidth={2} dot={false}
                            activeDot={{ r: 4, fill: 'var(--chart-secondary)' }} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
