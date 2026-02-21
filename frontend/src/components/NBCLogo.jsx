export function NBCLogo() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
                width: 170
            }}>
                <img src="./public/NBCM_logo.png"></img>
            </div>
            <div>
                <div style={{ color: '#f2f2f2', fontWeight: 600, fontSize: 14, lineHeight: 1 }}>
                    Financial Bias Analyser
                </div>
                <div style={{ color: '#8a8a96', fontSize: 11, lineHeight: 1.6 }}>
                    National Bank of Canada Hackathon
                </div>
            </div>
        </div>
    )
}
