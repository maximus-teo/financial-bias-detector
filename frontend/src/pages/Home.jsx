import { useState } from 'react'
import { motion } from 'framer-motion'
import { NBCLogo } from '../components/NBCLogo'
import UploadZone from '../components/UploadZone'
import TradeForm from '../components/TradeForm'

const TABS = ['Upload CSV', 'Add Trades Manually']

export default function Home() {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            {/* Navbar */}
            <nav style={{
                height: 56, display: 'flex', alignItems: 'center', padding: '0 24px',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)',
            }}>
                <NBCLogo />
            </nav>

            {/* Hero section */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <div style={{ width: '100%', maxWidth: 720 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                            <div style={{
                                display: 'inline-block',
                                background: 'var(--nbc-red-dim)',
                                border: '1px solid rgba(228,28,35,0.3)',
                                borderRadius: 20,
                                padding: '4px 14px',
                                fontSize: 12,
                                color: 'var(--nbc-red)',
                                fontWeight: 600,
                                marginBottom: 16,
                            }}>
                                Trading Psychology Analysis
                            </div>
                            <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.2 }}>
                                Discover Your Trading Biases
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
                                Upload your trade history or enter trades manually. We'll analyze overtrading, loss aversion, and revenge trading — powered by AI.
                            </p>
                        </div>

                        {/* Card */}
                        <div className="card">
                            {/* Tab switcher */}
                            <div style={{
                                display: 'flex', gap: 0,
                                marginBottom: 28,
                                background: 'var(--bg-primary)',
                                borderRadius: 8,
                                padding: 3,
                                border: '1px solid var(--border)',
                            }}>
                                {TABS.map((tab, i) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(i)}
                                        style={{
                                            flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                                            borderRadius: 6,
                                            background: activeTab === i ? 'var(--bg-card-hover)' : 'transparent',
                                            color: activeTab === i ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: activeTab === i ? 600 : 400,
                                            fontSize: 13,
                                            transition: 'all 0.15s',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: activeTab === 0 ? -10 : 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 0 ? <UploadZone /> : <TradeForm />}
                            </motion.div>
                        </div>

                        {/* Feature badges */}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
                            {[
                                { icon: '🧠', label: 'Behavioral Analysis' },
                                { icon: '⚡', label: 'AI-Powered Coach' },
                                { icon: '📈', label: '5 Chart Types' },
                                { icon: '🎯', label: '3 Bias Detectors' },
                            ].map(({ icon, label }) => (
                                <div key={label} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 14px', borderRadius: 20,
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    fontSize: 12, color: 'var(--text-secondary)',
                                }}>
                                    <span>{icon}</span>
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
