import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useSessionStore } from '../store/sessionStore'

const EMPTY_TRADE = {
    timestamp: '', asset: '', side: 'buy', quantity: '',
    entry_price: '', exit_price: '', profit_loss: '', balance: '',
}

export default function TradeForm() {
    const [current, setCurrent] = useState(EMPTY_TRADE)
    const [trades, setTrades] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const { setSession, setReport, setAnalyzing } = useSessionStore()
    const navigate = useNavigate()

    const handleChange = (field, value) =>
        setCurrent(prev => ({ ...prev, [field]: value }))

    const addTrade = (e) => {
        e.preventDefault()
        const t = {
            ...current,
            quantity: parseFloat(current.quantity),
            entry_price: parseFloat(current.entry_price),
            exit_price: parseFloat(current.exit_price),
            profit_loss: parseFloat(current.profit_loss),
            balance: parseFloat(current.balance),
        }
        if (Object.values(t).some(v => v === '' || v === null || Number.isNaN(v))) {
            setError('All fields are required.')
            return
        }
        setTrades(prev => [...prev, t])
        setCurrent(EMPTY_TRADE)
        setError(null)
    }

    const removeTrade = (i) => setTrades(prev => prev.filter((_, idx) => idx !== i))

    const submit = async () => {
        if (trades.length === 0) {
            setError('Add at least one trade before submitting.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const { session_id, trade_count } = await api.uploadManual(trades)
            setSession(session_id, 'manual_entry', trade_count)
            setAnalyzing(true)
            const report = await api.analyze(session_id)
            setReport(report)
            setAnalyzing(false)
            navigate('/dashboard')
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
            setAnalyzing(false)
        }
    }

    const inputStyle = { width: '100%' }
    const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }

    return (
        <div>
            <form onSubmit={addTrade}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={labelStyle}>Timestamp</label>
                        <input type="datetime-local" style={inputStyle} value={current.timestamp}
                            onChange={e => handleChange('timestamp', e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Asset</label>
                        <input placeholder="e.g. AAPL" style={inputStyle} value={current.asset}
                            onChange={e => handleChange('asset', e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Side</label>
                        <select style={inputStyle} value={current.side}
                            onChange={e => handleChange('side', e.target.value)}>
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Quantity</label>
                        <input type="number" step="any" placeholder="100" style={inputStyle} value={current.quantity}
                            onChange={e => handleChange('quantity', e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Entry Price</label>
                        <input type="number" step="any" placeholder="150.00" style={inputStyle} value={current.entry_price}
                            onChange={e => handleChange('entry_price', e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Exit Price</label>
                        <input type="number" step="any" placeholder="155.00" style={inputStyle} value={current.exit_price}
                            onChange={e => handleChange('exit_price', e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>P&amp;L ($)</label>
                        <input type="number" step="any" placeholder="500.00" style={inputStyle} value={current.profit_loss}
                            onChange={e => handleChange('profit_loss', e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Balance ($)</label>
                        <input type="number" step="any" placeholder="10000.00" style={inputStyle} value={current.balance}
                            onChange={e => handleChange('balance', e.target.value)} />
                    </div>
                </div>

                <button type="submit" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 7,
                    padding: '9px 18px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                }}>
                    + Add Trade
                </button>
            </form>

            {/* Trade list */}
            <AnimatePresence>
                {trades.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: 20 }}
                    >
                        <div className="section-label" style={{ marginBottom: 10 }}>
                            {trades.length} trade{trades.length !== 1 ? 's' : ''} added
                        </div>
                        <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        {['Timestamp', 'Asset', 'Side', 'Qty', 'Entry', 'Exit', 'P&L', 'Balance', ''].map(h => (
                                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.map((t, i) => (
                                        <motion.tr key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            style={{ borderBottom: '1px solid var(--border)' }}
                                        >
                                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{t.timestamp.replace('T', ' ')}</td>
                                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.asset}</td>
                                            <td style={{ padding: '6px 10px', color: t.side === 'buy' ? 'var(--severity-low)' : 'var(--nbc-red)', textTransform: 'uppercase' }}>{t.side}</td>
                                            <td style={{ padding: '6px 10px' }}>{t.quantity}</td>
                                            <td style={{ padding: '6px 10px' }}>${t.entry_price}</td>
                                            <td style={{ padding: '6px 10px' }}>${t.exit_price}</td>
                                            <td style={{ padding: '6px 10px', color: t.profit_loss >= 0 ? 'var(--severity-low)' : 'var(--nbc-red)', fontWeight: 600 }}>
                                                {t.profit_loss >= 0 ? '+' : ''}{t.profit_loss}
                                            </td>
                                            <td style={{ padding: '6px 10px' }}>${t.balance}</td>
                                            <td style={{ padding: '6px 10px' }}>
                                                <button onClick={() => removeTrade(i)} style={{
                                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16
                                                }}>×</button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <div style={{ marginTop: 10, color: 'var(--nbc-red)', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={submit} disabled={loading || trades.length === 0}
                    style={{ minWidth: 160 }}>
                    {loading ? 'Analyzing…' : `Analyze ${trades.length} Trade${trades.length !== 1 ? 's' : ''}`}
                </button>
            </div>
        </div>
    )
}
