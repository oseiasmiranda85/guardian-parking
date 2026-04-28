
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
                operator: true // Fetch Operator (TenantUser)
            }
        })

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
        })

        const summary = Object.values(grouping)

        return NextResponse.json(summary)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
