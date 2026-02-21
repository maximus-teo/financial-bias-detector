export function NBCLogo() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
                src="/nbc-logo.jpg" 
                alt="NBC Logo"
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    objectFit: 'cover',
                    flexShrink: 0,
                }}
            />
            <div>
                <div style={{ color: '#f2f2f2', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                    National Bank
                </div>
                <div style={{ color: '#8a8a96', fontSize: 12, lineHeight: 1.3 }}>
                    Bias Detector
                </div>
            </div>
        </div>
    )
}
