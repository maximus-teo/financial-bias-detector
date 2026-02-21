import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function WinLossBar({ report }) {
    if (!report) return null

    const { summary_stats } = report
    const { win_count, loss_count } = summary_stats

    const trades = report.trades || []
    const wins = trades.filter(t => t.profit_loss > 0).map(t => t.profit_loss)
    const losses = trades.filter(t => t.profit_loss < 0).map(t => Math.abs(t.profit_loss))
    const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0

    const data = [
        { name: 'Avg Win', value: parseFloat(avgWin.toFixed(2)), color: '#3dd68c' },
        { name: 'Avg Loss', value: parseFloat(avgLoss.toFixed(2)), color: '#E41C23' },
    ]

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        return (
            <div style={{
                background: '#1e1e26', border: '1px solid var(--border-strong)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12,
            }}>
                <div style={{ color: payload[0].payload.color, fontWeight: 700 }}>
                    {payload[0].payload.name}: ${payload[0].value.toFixed(2)}
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className="section-label">Win vs Loss Distribution</span>
                <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 11, color: '#3dd68c' }}>✓ {win_count} wins</span>
                    <span style={{ fontSize: 11, color: '#E41C23' }}>✗ {loss_count} losses</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
