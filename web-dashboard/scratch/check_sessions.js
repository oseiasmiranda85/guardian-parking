const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const sessions = await prisma.cashSession.findMany({
        where: { tenantId: 22 },
        orderBy: { startTime: 'desc' },
        take: 20,
        include: {
            user: {
                select: { name: true }
            }
        }
    })

    console.log('\n--- AUDITORIA DE STATUS DE CAIXA (TENANT 22) ---')
    console.log('------------------------------------------------------------------')
    sessions.forEach(s => {
        const start = s.startTime.toLocaleString('pt-BR')
        const end = s.endTime ? s.endTime.toLocaleString('pt-BR') : 'EM ABERTO'
        const status = s.status === 'CLOSED' ? '✅ FECHADO' : '⏳ ABERTO'
        console.log(`${status} | Op: ${s.user.name.padEnd(15)} | Início: ${start} | Fim: ${end}`)
    })
    console.log('------------------------------------------------------------------\n')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
