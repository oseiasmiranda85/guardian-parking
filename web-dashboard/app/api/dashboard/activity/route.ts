
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        const limit = 5
        const whereClause: any = {}
        
        if (tenantId) {
            if (tenantId.startsWith('ALL_')) {
                const ownerId = parseInt(tenantId.split('_')[1])
                const tenants = await prisma.tenant.findMany({ where: { ownerId }, select: { id: true } })
                whereClause.tenantId = { in: tenants.map(t => t.id) }
            } else {
                whereClause.tenantId = parseInt(tenantId)
            }
        }

        // Fetch recent tickets (entries)
        const recentTickets = await prisma.ticket.findMany({
            where: whereClause,
            orderBy: { entryTime: 'desc' },
            take: limit,
            include: {
                // If you had vehicle relation, include it
            }
        })

        // Serialize fields
        const activity = recentTickets.map(t => ({
            id: t.id,
            plate: t.plate || 'N/A',
            // Simple inference for now since we lack direct relation in this context
            type: t.pricingTableId ? 'Tabelado' : 'Rotativo',
            time: new Date(t.entryTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
            status: t.status,
            amount: t.ticketType === 'CORTESIA' ? 0 : (t.amountPaid !== null ? t.amountPaid : (t.amountDue || 0))
        }))

        return NextResponse.json(activity)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
