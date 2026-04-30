
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json([], { status: 400 })

        let whereClause: any = {}

        if (tenantId.startsWith('ALL_')) {
            const ownerId = parseInt(tenantId.split('_')[1])
            const tenants = await prisma.tenant.findMany({ where: { ownerId }, select: { id: true } })
            whereClause = { tenantId: { in: tenants.map(t => t.id) } }
        } else {
            const tid = parseInt(tenantId)
            whereClause = { tenantId: tid }
        }

        // Fetch all transactions with operator info
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                operator: true
            }
        })

        // Fetch Courtesy and Accredited tickets to calculate renounced revenue
        const exemptionTickets = await prisma.ticket.findMany({
            where: {
                ...whereClause,
                ticketType: { in: ['CORTESIA', 'ACCREDITED', 'CREDENCIADO'] }
            },
            include: {
                entryOperator: true,
                exitOperator: true
            }
        })

        // Fetch active pricing for base price calculation
        const activePricing = await prisma.pricingTable.findFirst({
            where: { ...whereClause, isActive: true },
            include: { slots: { orderBy: { minMinutes: 'asc' }, take: 1 } }
        })
        const basePrice = activePricing?.slots[0]?.price || 10.0

        // Group by Operator
        const grouping: any = {}

        transactions.forEach(t => {
            const opName = t.operator?.name || 'Sistema / Totens'

            if (!grouping[opName]) {
                grouping[opName] = {
                    id: t.operatorId || 'sys',
                    operator: opName,
                    tickets: 0,
                    card: 0,
                    cash: 0,
                    total: 0,
                    pix: 0,
                    vehicle: 'Geral' // Could be refined if we look at ticket types
                }
            }

            grouping[opName].total += t.amount
            grouping[opName].tickets += 1 // Count transactions as "tickets" for financial summary

            if (t.method === 'CASH') grouping[opName].cash += t.amount
            else if (t.method === 'CREDIT' || t.method === 'DEBIT') grouping[opName].card += t.amount
            else if (t.method === 'PIX') grouping[opName].pix += t.amount
            else if (t.method === 'CORTESIA') grouping[opName].courtesy += 1
        })

        // Process Exemptions
        exemptionTickets.forEach(ticket => {
            // Priority to exit operator for exemption "approval"
            const opName = ticket.exitOperator?.name || ticket.entryOperator?.name || 'Sistema / Totens'
            
            if (!grouping[opName]) {
                grouping[opName] = {
                    id: ticket.exitOperatorId || ticket.entryOperatorId || 'sys',
                    operator: opName,
                    tickets: 0,
                    card: 0,
                    cash: 0,
                    total: 0,
                    pix: 0,
                    courtesy: 0,
                    accredited: 0,
                    renounced: 0,
                    vehicle: 'Geral'
                }
            }

            if (ticket.ticketType === 'CORTESIA') {
                grouping[opName].courtesy += 1
                grouping[opName].renounced += basePrice
            } else {
                grouping[opName].accredited += 1
                grouping[opName].renounced += basePrice
            }
        })

        const summary = Object.values(grouping)

        return NextResponse.json(summary)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
