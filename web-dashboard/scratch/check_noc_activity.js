const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkActivity() {
    console.log('--- AUDITORIA DE ATIVIDADE RECENTE ---')
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    const newTickets = await prisma.ticket.count({
        where: { updatedAt: { gte: tenMinutesAgo } }
    })
    console.log(`Tickets atualizados nos últimos 10 min: ${newTickets}`)

    const telemetryCount = await prisma.performanceTelemetry.count()
    console.log(`Total de registros de telemetria: ${telemetryCount}`)

    const lastSync = await prisma.device.findMany({
        take: 5,
        orderBy: { lastSeen: 'desc' },
        select: { posId: true, name: true, lastSeen: true }
    })
    console.log('Últimos dispositivos vistos:')
    lastSync.forEach(d => console.log(`- ${d.posId} (${d.name}): ${d.lastSeen}`))

    await prisma.$disconnect()
}

checkActivity()
