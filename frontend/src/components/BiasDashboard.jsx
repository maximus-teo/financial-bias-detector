import BiasCard from './BiasCard'

export default function BiasDashboard({ biases }) {
    if (!biases?.length) return null

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
        }}>
            {biases.map((bias, i) => (
                <BiasCard key={bias.bias} bias={bias} index={i} />
            ))}
        </div>
    )
}
