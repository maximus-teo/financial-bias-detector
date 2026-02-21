import {
    RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip
} from 'recharts'

const BIAS_LABELS = {
    overtrading: 'Overtrading',
    loss_aversion: 'Loss Aversion',
    revenge_trading: 'Revenge Trading',
}

export default function BiasRadar({ biases }) {
    if (!biases?.length) return null

    const data = biases.map(b => ({
        bias: BIAS_LABELS[b.bias] || b.bias,
        score: Math.round(b.score * 100),
        fullMark: 100,
    }))

    return (
        <div className="card" style={{ height: '100%' }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Bias Radar</div>
            <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={data} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
                    <PolarGrid stroke="var(--chart-grid)" />
                    <PolarAngleAxis
                        dataKey="bias"
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#1e1e26', border: '1px solid var(--border-strong)',
                            borderRadius: 8, fontSize: 12,
                        }}
                        formatter={(val) => [`${val}/100`, 'Score']}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                    />
                    <Radar
                        name="Bias Score"
                        dataKey="score"
                        stroke="var(--nbc-red)"
                        fill="var(--nbc-red)"
                        fillOpacity={0.18}
                        strokeWidth={2}
                        dot={{ fill: 'var(--nbc-red)', r: 4 }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
