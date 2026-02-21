import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useSessionStore } from '../store/sessionStore'

function TypingIndicator() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 6 }}>NBC Coach is thinking…</span>
            {[0, 1, 2].map(i => (
                <motion.div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--text-secondary)',
                }}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </div>
    )
}

export default function ChatPanel({ isOpen, onClose }) {
    const { sessionId, setReport } = useSessionStore()
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [onboardingComplete, setOnboardingComplete] = useState(false)
    const [turnCount, setTurnCount] = useState(0)
    const [onboardingDone, setOnboardingDone] = useState(false)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)

    // Scroll to bottom whenever messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300)
            // Auto-send greeting on first open
            if (messages.length === 0) {
                sendMessage("Hello, I'd like to understand my trading psychology.")
            }
        }
    }, [isOpen])

    const sendMessage = async (text) => {
        if (!text.trim() || !sessionId) return
        const userMsg = { role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const history = messages.filter(m => m.role !== 'system')
            const res = await api.chat(sessionId, text, history)
            const agentMsg = { role: 'assistant', content: res.response }
            setMessages(prev => [...prev, agentMsg])
            setTurnCount(res.turn_count)

            if (res.updated_report) {
                setReport(res.updated_report)
            }

            if (res.onboarding_complete && !onboardingComplete) {
                setOnboardingComplete(true)
                setTimeout(() => setOnboardingDone(true), 3000)
            }
        } catch (e) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `I encountered an error: ${e.message}. Please try again.`,
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        sendMessage(input)
    }

    const questionsCompleted = Math.min(turnCount, 4)
    const isEndsWithQuestion = (text) => text?.trimEnd().endsWith('?')

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: 380 }}
                    animate={{ x: 0 }}
                    exit={{ x: 380 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: 380, zIndex: 100,
                        background: 'rgba(14, 14, 16, 0.97)',
                        backdropFilter: 'blur(16px)',
                        borderLeft: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column',
                    }}
                >
                    {/* Panel header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>NBC Coach</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Trading Psychology Advisor</div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-tertiary)', fontSize: 20, lineHeight: 1,
                        }}>×</button>
                    </div>

                    {/* Onboarding progress */}
                    <AnimatePresence>
                        {!onboardingComplete && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                                    <span>Getting to know you…</span>
                                    <span>{questionsCompleted}/4</span>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} style={{
                                            flex: 1, height: 3, borderRadius: 2,
                                            background: i < questionsCompleted ? 'var(--nbc-red)' : 'var(--border)',
                                            transition: 'background 0.3s',
                                        }} />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Assessment complete banner */}
                    <AnimatePresence>
                        {onboardingDone && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    margin: '10px 16px 0',
                                    padding: '8px 14px',
                                    background: 'rgba(61,214,140,0.1)',
                                    border: '1px solid rgba(61,214,140,0.3)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: 'var(--severity-low)',
                                    textAlign: 'center',
                                }}
                            >
                                Assessment complete ✓
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
                        {messages.map((msg, i) => {
                            const isUser = msg.role === 'user'
                            const isQuestion = !isUser && isEndsWithQuestion(msg.content)
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        marginBottom: 12,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isUser ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    {isQuestion && (
                                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, paddingLeft: 4 }}>
                                            Coach is asking…
                                        </div>
                                    )}
                                    <div style={{
                                        maxWidth: '88%',
                                        padding: '10px 14px',
                                        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                        background: isUser ? 'var(--nbc-red-dim)' : '#1c1c1f',
                                        border: isUser
                                            ? '1px solid rgba(228,28,35,0.3)'
                                            : '1px solid var(--border)',
                                        fontSize: 13,
                                        lineHeight: 1.55,
                                        color: 'var(--text-primary)',
                                        borderBottom: isQuestion ? '2px solid rgba(228,28,35,0.3)' : undefined,
                                        whiteSpace: 'pre-wrap',
                                    }}>
                                        {msg.content}
                                    </div>
                                </motion.div>
                            )
                        })}

                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ marginBottom: 12 }}
                            >
                                <TypingIndicator />
                            </motion.div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input bar */}
                    <form onSubmit={handleSubmit} style={{
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        display: 'flex', gap: 8,
                    }}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask your trading coach…"
                            style={{ flex: 1 }}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            style={{
                                background: 'var(--nbc-red)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 7,
                                padding: '0 14px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 16,
                                opacity: !input.trim() ? 0.5 : 1,
                            }}
                        >
                            ↑
                        </button>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
