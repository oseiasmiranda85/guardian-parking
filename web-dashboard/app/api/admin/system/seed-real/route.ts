
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        // 1. Limpeza Segura (Ordem de dependência)
        console.log("Cleaning database...")
        await prisma.externalIntegration.deleteMany({})
        await prisma.invoice.deleteMany({})
        await prisma.subscription.deleteMany({})
        await prisma.cashSession.deleteMany({})
        await prisma.transaction.deleteMany({})
        await prisma.ticket.deleteMany({})
        await prisma.device.deleteMany({})
        await prisma.tenantUser.deleteMany({})
        await prisma.tenant.deleteMany({})
        await prisma.owner.deleteMany({})

        // 2. Criar Owners Reais
        const owner1 = await prisma.owner.create({
            data: { name: 'Empresa de Estacionamentos Alpha Ltda', document: '12.345.678/0001-90', email: 'contato@alpha.com.br' }
        })
        const owner2 = await prisma.owner.create({
            data: { name: 'João da Silva Santos', document: '123.456.789-00', email: 'joao.santos@gmail.com' }
        })

        // 3. Criar Tenants Reais
        const tenant1 = await prisma.tenant.create({
            data: { 
                name: 'Estacionamento Central Matrix', 
                ownerId: owner1.id, 
                address: 'Av. Paulista, 1000, SP',
                totalSpots: 120 
            }
        })
        const tenant2 = await prisma.tenant.create({
            data: { 
                name: 'Shopping Plaza Sul', 
                ownerId: owner1.id, 
                address: 'Rua das Flores, 50, Curitiba',
                totalSpots: 450 
            }
        })

        // 4. Criar Assinaturas Reais
        await prisma.subscription.create({
            data: { tenantId: tenant1.id, type: 'RECURRING_MONTHLY', status: 'ACTIVE', value: 299.90, validUntil: new Date('2026-12-31') }
        })
        await prisma.subscription.create({
            data: { tenantId: tenant2.id, type: 'RECURRING_MONTHLY', status: 'ACTIVE', value: 899.00, validUntil: new Date('2026-12-31') }
        })

        // 5. Criar Invoices Reais (Faturamento)
        await prisma.invoice.create({
            data: { tenantId: tenant1.id, amount: 299.90, referenceMonth: '04/2026', dueDate: new Date(), status: 'PAID', paidAt: new Date(), finalAmount: 299.90 }
        })
        await prisma.invoice.create({
            data: { tenantId: tenant2.id, amount: 899.00, referenceMonth: '04/2026', dueDate: new Date(), status: 'PENDING' }
        })

        // 6. Criar Integrações Reais
        await prisma.externalIntegration.create({
            data: { tenantId: tenant1.id, name: 'WhatsApp Notificações', type: 'WEBHOOK', targetUrl: 'https://api.whatsapp.com/send', status: 'ACTIVE' }
        })
        await prisma.externalIntegration.create({
            data: { tenantId: tenant2.id, name: 'ERP Totvs Senior', type: 'REST_API', targetUrl: 'https://api.senior.com.br/webhook', status: 'ERROR' }
        })

        return NextResponse.json({ success: true, message: "Banco limpo e populado com dados reais com sucesso." })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
