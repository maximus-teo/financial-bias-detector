import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSessionStore = create(
    persist(
        (set, get) => ({
            sessionId: null,
            filename: null,
            tradeCount: 0,
            report: null,
            analyzing: false,

            setSession: (sessionId, filename, tradeCount) =>
                set({ sessionId, filename, tradeCount }),

            setReport: (report) => set({ report }),

            setAnalyzing: (v) => set({ analyzing: v }),

            clearSession: () =>
                set({ sessionId: null, filename: null, tradeCount: 0, report: null }),
        }),
        {
            name: 'bias-detector-session',
            partialize: (state) => ({
                sessionId: state.sessionId,
                filename: state.filename,
                tradeCount: state.tradeCount,
                // report is excluded - fetched from backend on load
            }),
        }
    )
)
