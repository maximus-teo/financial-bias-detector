import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSessionStore } from '../store/sessionStore'
import { api } from '../api/client'
import { NBCLogo } from '../components/NBCLogo'
import RiskProfileBadge from '../components/RiskProfileBadge'
import BiasDashboard from '../components/BiasDashboard'
import ChatPanel from '../components/ChatPanel'
import PnLTimeline from '../components/charts/PnLTimeline'
import BiasRadar from '../components/charts/BiasRadar'
import TradingHeatmap from '../components/charts/TradingHeatmap'
import WinLossBar from '../components/charts/WinLossBar'
import DrawdownChart from '../components/charts/DrawdownChart'

const NAV_ITEMS = [
    { icon: '📊', label: 'Overview', id: 'overview' },
    { icon: '🧠', label: 'Biases', id: 'biases' },
    { icon: '📈', label: 'Performance', id: 'performance' },
    { icon: '🗓', label: 'Heatmap', id: 'heatmap' },
]

export default function Dashboard() {
    const { sessionId, filename, report, setReport } = useSessionStore()
    const [activeNav, setActiveNav] = useState('overview')
    const [chatOpen, setChatOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (!sessionId) return
        if (!report) {
            setLoading(true)
            api.getReport(sessionId)
                .then(r => { setReport(r); setLoading(false) })
                .catch(() => {
                    api.analyze(sessionId)
                        .then(r => { setReport(r); setLoading(false) })
                        .catch(() => setLoading(false))
                })
        }
    }, [sessionId])

    if (loading && !report) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)',
            }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[0, 1, 2].map(i => (
                        <motion.div key={i} style={{
                            width: 10, height: 10, borderRadius: '50%', background: 'var(--nbc-red)',
                        }}
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading analysis…</div>
            </div>
        )
    }

    if (!report) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)', flexDirection: 'column', gap: 16,
            }}>
                <div style={{ color: 'var(--text-secondary)' }}>No report found.</div>
                <button className="btn-primary" onClick={() => navigate('/')}>Go Back</button>
            </div>
        )
    }

    const trades = report.trades || []

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            {/* Top navbar */}
            <nav style={{
                height: 56, display: 'flex', alignItems: 'center',
                padding: '0 24px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 50,
                gap: 24,
            }}>
                <NBCLogo />
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {filename && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {filename} · {report.trade_count.toLocaleString()} trades
                        </span>
                    )}
                    <div style={{
                        padding: '4px 12px', borderRadius: 20,
                        background: report.risk_profile?.profile === 'Aggressive' ? 'var(--severity-high-bg)'
                            : report.risk_profile?.profile === 'Moderate' ? 'var(--severity-medium-bg)'
                                : 'var(--severity-low-bg)',
                        color: report.risk_profile?.profile === 'Aggressive' ? 'var(--nbc-red)'
                            : report.risk_profile?.profile === 'Moderate' ? 'var(--severity-medium)'
                                : 'var(--severity-low)',
                        fontSize: 12, fontWeight: 600,
                    }}>
                        {report.risk_profile?.profile} Risk
                    </div>
                    <button
                        onClick={() => setChatOpen(v => !v)}
                        style={{
                            background: chatOpen ? 'var(--nbc-red)' : 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            color: chatOpen ? 'white' : 'var(--text-primary)',
                            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                            transition: 'all 0.15s',
                        }}
                    >
                        {chatOpen ? '✕ Close Chat' : '💬 Ask NBC Coach'}
                    </button>
                    <button onClick={() => navigate('/')} style={{
                        background: 'none', border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 14px',
                        cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                    }}>
                        ← New Session
                    </button>
                </div>
            </nav>

            {/* Main layout */}
            <div style={{ display: 'flex', flex: 1 }}>
                {/* Sidebar */}
                <aside style={{
                    width: 220, background: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border)',
                    padding: '20px 0',
                    flexShrink: 0,
                }}>
                    {NAV_ITEMS.map(item => (
                        <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '10px 20px', textAlign: 'left',
                            background: activeNav === item.id ? 'var(--nbc-red-glow)' : 'transparent',
                            borderLeft: activeNav === item.id ? '3px solid var(--nbc-red)' : '3px solid transparent',
                            border: 'none', cursor: 'pointer',
                            color: activeNav === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: 13, fontFamily: 'inherit', fontWeight: activeNav === item.id ? 600 : 400,
                            transition: 'all 0.15s',
                        }}>
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}

                    {/* Risk overview in sidebar */}
                    <div style={{ margin: '24px 16px 0', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                        <div className="section-label" style={{ marginBottom: 12, paddingLeft: 4 }}>Bias Scores</div>
                        {report.biases?.map(b => {
                            const severityLower = (b.severity || 'low').toLowerCase()
                            return (
                                <div key={b.bias} style={{ marginBottom: 8, paddingLeft: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                            {b.bias.replace('_', ' ')}
                                        </span>
                                        <span style={{
                                            fontWeight: 600, fontFeatureSettings: '"tnum"',
                                            color: severityLower === 'high' ? 'var(--nbc-red)'
                                                : severityLower === 'medium' ? 'var(--severity-medium)'
                                                    : 'var(--severity-low)',
                                        }}>
                                            {Math.round(b.score * 100)}
                                        </span>
                                    </div>
                                    <div style={{ background: 'var(--border)', borderRadius: 3, height: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3,
                                            width: `${b.score * 100}%`,
                                            background: severityLower === 'high' ? 'var(--nbc-red)'
                                                : severityLower === 'medium' ? 'var(--severity-medium)'
                                                    : 'var(--severity-low)',
                                            transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </aside>

                {/* Main content */}
                <main style={{
                    flex: 1, padding: 28, overflowY: 'auto',
                    marginRight: chatOpen ? 380 : 0,
                    transition: 'margin-right 0.28s ease',
                    display: 'flex', flexDirection: 'column', gap: 20,
                }}>
                    {/* Risk profile banner */}
                    <RiskProfileBadge report={report} />

                    {/* Bias cards – 4 up */}
                    <BiasDashboard biases={report.biases} />

                    {/* Charts row 1: PnL (2/3) + Radar (1/3) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        <PnLTimeline trades={trades} />
                        <BiasRadar biases={report.biases} />
                    </div>

                    {/* Full-width heatmap */}
                    <TradingHeatmap trades={trades} />

                    {/* Charts row 2: WinLoss (1/2) + Drawdown (1/2) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <WinLossBar report={report} />
                        <DrawdownChart trades={trades} />
                    </div>
                </main>
            </div>

            {/* Chat panel */}
            <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
