const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTelemetry() {
    console.log('--- VERIFICAÇÃO DE TELEMETRIA EM TEMPO REAL ---')
    
    // Check total count
    const total = await prisma.performanceTelemetry.count()
    console.log(`Total de registros de telemetria: ${total}`)

    // Check last 5 entries
    const latest = await prisma.performanceTelemetry.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: { tenant: true }
    })

    if (latest.length === 0) {
        console.log('Nenhum dado de telemetria recebido ainda.')
    } else {
        console.log('Últimos 5 registros recebidos:')
        latest.forEach(t => {
            console.log(`[${t.timestamp.toISOString()}] Tenant: ${t.tenant?.name || 'Desconhecido'} | OCR: ${t.ocrTimeMs}ms | API: ${t.apiLatencyMs}ms | Tipo: ${t.flowType}`)
        })
    }

    // Check Neon Metrics (simulated via API in real app, but here we can check if they exist)
    const neonStats = await prisma.systemAudit.findMany({
        where: { action: 'NEON_METRICS_SYNC' },
        take: 1,
        orderBy: { timestamp: 'desc' }
    })
    console.log(`Última sincronização Neon: ${neonStats[0]?.timestamp?.toISOString() || 'Nunca'}`)

    await prisma.$disconnect()
}

checkTelemetry()
