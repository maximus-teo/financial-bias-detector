export function NBCLogo() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: '#E41C23',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'white', fontSize: 12, letterSpacing: '-0.5px',
                flexShrink: 0,
            }}>
                NBC
            </div>
            <div>
                <div style={{ color: '#f2f2f2', fontWeight: 600, fontSize: 14, lineHeight: 1 }}>
                    National Bank
                </div>
                <div style={{ color: '#8a8a96', fontSize: 11, lineHeight: 1.6 }}>
                    Bias Detector
                </div>
            </div>
        </div>
    )
}
