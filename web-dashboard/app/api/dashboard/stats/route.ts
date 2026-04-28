import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyAuth, validateTenantAccess } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        // 1. Verify Auth
        const auth = await verifyAuth(request)
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { searchParams } = new URL(request.url)
        const requestedId = searchParams.get('tenantId')

        // 2. Validate Access
        const access = validateTenantAccess(auth.payload, requestedId)
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status })
        }

        // Default to current month if not provided
        const now = new Date()
        const currentRefMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
        const referenceMonth = searchParams.get('month') || currentRefMonth

        // Filter Logic
        const invWhere: any = { referenceMonth: referenceMonth }
        if (access.tenantId) invWhere.tenantId = access.tenantId

        const genericWhere: any = {}
        if (access.tenantId) genericWhere.tenantId = access.tenantId

        const invoices = await prisma.invoice.findMany({
            where: invWhere
        })

        let totalRevenue = 0
        let received = 0
        let pending = 0

        invoices.forEach(inv => {
            const amount = inv.finalAmount || inv.amount
            totalRevenue += amount

            if (inv.status === 'PAID') {
                received += amount
            } else if (inv.status === 'PENDING' || inv.status === 'OVERDUE') {
                pending += amount
            }
        })

        // Count Active Vehicles (Proxy for Occupation)
        const activeVehicles = await prisma.vehicle.count({ where: genericWhere })
        // Count Transactions (Proxy for throughput)
        const transactionCount = await prisma.transaction.count({ where: genericWhere })

        return NextResponse.json({
            mrr: totalRevenue,
            received,
            pending,
            activeVehicles,
            transactions: transactionCount,
            referenceMonth
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
