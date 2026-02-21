import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useSessionStore } from '../store/sessionStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function UploadZone() {
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const { setSession, setReport, setAnalyzing } = useSessionStore()
    const navigate = useNavigate()

    const handleFile = useCallback(async (file) => {
        if (!file || (!file.name.endsWith('.csv') && !file.name.endsWith('.json'))) {
            setError('Please upload a CSV or JSON file.')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const { session_id, trade_count, filename } = await api.uploadFile(file)
            setSession(session_id, filename, trade_count)
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
    }, [navigate, setSession, setReport, setAnalyzing])

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        handleFile(file)
    }, [handleFile])

    const onFileInput = (e) => handleFile(e.target.files[0])

    return (
        <div>
            <motion.label
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'block',
                    border: `2px dashed ${dragging ? 'var(--nbc-red)' : 'var(--border-strong)'}`,
                    borderRadius: 12,
                    padding: '48px 32px',
                    textAlign: 'center',
                    cursor: loading ? 'wait' : 'pointer',
                    background: dragging ? 'var(--nbc-red-glow)' : 'transparent',
                    transition: 'all 0.2s',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                <input
                    type="file"
                    accept=".csv,.json"
                    style={{ display: 'none' }}
                    onChange={onFileInput}
                    disabled={loading}
                />

                {loading ? (
                    <div>
                        <div className="section-label" style={{ marginBottom: 12 }}>Analyzing your trades…</div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--nbc-red)' }}
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
                            Drop your trade file here
                        </div>
                        <div className="section-label">
                            or click to browse &nbsp;·&nbsp; CSV or JSON format required
                        </div>
                        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
                            Columns: timestamp, asset, side, quantity, entry_price, exit_price, profit_loss, balance
                        </div>
                    </>
                )}
            </motion.label>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            marginTop: 12,
                            padding: '10px 14px',
                            background: 'var(--severity-high-bg)',
                            border: '1px solid var(--nbc-red)',
                            borderRadius: 8,
                            color: 'var(--nbc-red)',
                            fontSize: 13,
                        }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
