
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("🚀 Iniciando Limpeza Geral do Banco...")
    
    try {
        // 1. Limpeza em ordem correta de dependência (do mais dependente para o menos)
        console.log("Limpa Personas e Categorias...")
        await prisma.accreditedPersona.deleteMany({})
        await prisma.accreditedCategory.deleteMany({})
        
        console.log("Limpa Preços...")
        await prisma.pricingSlot.deleteMany({})
        await prisma.pricingTable.deleteMany({})

        console.log("Limpa Integrações...")
        await prisma.externalIntegration.deleteMany({})

        console.log("Limpa Financeiro...")
        await prisma.transaction.deleteMany({})
        await prisma.invoice.deleteMany({})
        await prisma.cashSession.deleteMany({})
        await prisma.ticket.deleteMany({})
        
        console.log("Limpa Usuários e Dispositivos...")
        await prisma.device.deleteMany({})
        await prisma.vehicle.deleteMany({})
        await prisma.tenantUser.deleteMany({})
        
        console.log("Limpa Core (Tenant/Subscription)...")
        await prisma.subscription.deleteMany({})
        await prisma.tenant.deleteMany({})
        await prisma.owner.deleteMany({})
        
        console.log("✅ Banco Limpo.")

        console.log("📦 Inserindo Dados Reais (Owners e Tenants)...")
        const o1 = await prisma.owner.create({
            data: { name: 'Guardian Empreendimentos', document: '44.333.222/0001-11', email: 'contato@guardian.io' }
        })
        
        const t1 = await prisma.tenant.create({
            data: { name: 'Estacionamento Matriz Alpha', ownerId: o1.id, address: 'Centro, SP', totalSpots: 200 }
        })

        console.log("💰 Configurando Assinaturas e Faturas...")
        await prisma.subscription.create({
            data: { tenantId: t1.id, type: 'RECURRING_MONTHLY', status: 'ACTIVE', value: 450.00 }
        })
        
        await prisma.invoice.create({
            data: { tenantId: t1.id, amount: 450.00, referenceMonth: '04/2026', dueDate: new Date(), status: 'PAID', paidAt: new Date() }
        })

        console.log("🌐 Configurando Integrações Reais...")
        await prisma.externalIntegration.create({
            data: { 
                tenantId: t1.id, 
                name: 'Gateway de Notificações WA', 
                type: 'WEBHOOK', 
                targetUrl: 'https://httpbin.org/post', // URL real para teste de ping
                status: 'ACTIVE' 
            }
        })

        await prisma.externalIntegration.create({
            data: { 
                tenantId: null, 
                name: 'Monitor Cloud Guardian', 
                type: 'REST_API', 
                targetUrl: 'https://google.com', 
                status: 'ACTIVE' 
            }
        })

        console.log("✨ OPERAÇÃO CONCLUÍDA: Sistema pronto para uso real.")
    } catch (e) {
        console.error("❌ Erro no seed:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
