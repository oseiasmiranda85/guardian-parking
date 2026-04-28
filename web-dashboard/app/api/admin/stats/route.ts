
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const monthParam = searchParams.get('month')
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        // 1. Determine Date Range for CASH Basis (Received)
        let cashStart: Date | undefined
        let cashEnd: Date | undefined
        // 2. Determine Filter for ACCRUAL Basis (Reference/Pending)
        let accrualWhere: any = {}

        if (monthParam === 'ALL') {
            // ALL TIME
            cashStart = undefined
            cashEnd = undefined
            accrualWhere = {}
        } else if (startDateParam && endDateParam) {
            // CUSTOM RANGE
            cashStart = new Date(startDateParam)
            cashEnd = new Date(endDateParam)
            // Fix end date to end of day
            cashEnd.setHours(23, 59, 59, 999)

            // For Accrual, we filter by DueDate in this range
            accrualWhere = {
                dueDate: {
                    gte: cashStart,
                    lte: cashEnd
                }
            }
        } else {
            // SPECIFIC MONTH (MM/YYYY)
            const now = new Date()
            const currentRefMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
            const selectedMonthStr = monthParam || currentRefMonth // "01/2026"

            const [m, y] = selectedMonthStr.split('/')
            cashStart = new Date(parseInt(y), parseInt(m) - 1, 1) // 1st day
            cashEnd = new Date(parseInt(y), parseInt(m), 0) // Last day
            cashEnd.setHours(23, 59, 59, 999)

            // For Accrual, we filter by ReferenceMonth string
            accrualWhere = { referenceMonth: selectedMonthStr }
        }

        // --- PLATFORM METRICS ---
        const totalTenants = await prisma.tenant.count()
        const totalOwners = await prisma.owner.count()
        const activeTenants = await prisma.subscription.count({ where: { status: 'ACTIVE' } })
        const blockedTenants = await prisma.subscription.count({ where: { status: 'BLOCKED' } })

        // --- FINANCIAL METRICS ---

        // A. ACCRUAL (COMPETÊNCIA) - What should we receive for this period?
        const accrualInvoices = await prisma.invoice.findMany({
            where: accrualWhere
        })

        let totalRevenue = 0 // Expected MRR
        let pending = 0      // Still open for this period

        accrualInvoices.forEach(inv => {
            const val = inv.finalAmount || inv.amount
            totalRevenue += val

            // If it's NOT paid, it's pending/overdue
            if (inv.status !== 'PAID') {
                pending += val
            }
        })

        // B. CASH (CAIXA) - What did we actually receive in this period?
        // Regardless of when the bill was issued (Reference). 
        // We care about 'paidAt'.

        let received = 0

        const cashWhere: any = {
            status: 'PAID'
        }

        if (cashStart && cashEnd) {
            cashWhere.paidAt = {
                gte: cashStart,
                lte: cashEnd
            }
        }

        const cashInvoices = await prisma.invoice.findMany({
            where: cashWhere,
            select: { finalAmount: true, amount: true }
        })

        received = cashInvoices.reduce((acc, inv) => acc + (inv.finalAmount || inv.amount), 0)


        // --- RECENT TENANTS ---
        const recentTenants = await prisma.tenant.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { owner: true, subscription: true }
        })

        const formattedTenants = recentTenants.map(t => ({
            id: t.id,
            name: t.name,
            owner: t.owner.name,
            status: t.subscription?.status || 'PENDING',
            plan: t.subscription?.type === 'RECURRING_MONTHLY' ? 'Assinatura Mensal' : 'Evento'
        }))

        return NextResponse.json({
            stats: {
                totalTenants,
                activeTenants,
                blockedTenants,
                totalRevenue,
                received,
                pending,
                totalOwners
            },
            recentTenants: formattedTenants
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
