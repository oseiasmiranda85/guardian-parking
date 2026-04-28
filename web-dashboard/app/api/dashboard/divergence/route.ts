import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId || tenantId.startsWith('ALL_')) {
             return NextResponse.json({ error: 'TenantId invalid' }, { status: 400 })
        }

        const tid = parseInt(tenantId)

        // Get start and end of today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const tomorrow = new Date()
        tomorrow.setHours(23, 59, 59, 999)

        // Find all tickets today
        const todayTickets = await prisma.ticket.findMany({
            where: {
                tenantId: tid,
                entryTime: { gte: today, lte: tomorrow }
            }
        })

        // Metrics
        const totalEntries = todayTickets.length
        const prepaidCount = todayTickets.filter(t => (t.status === 'PAID' || t.status === 'Paid') && t.amountPaid && t.amountPaid > 0).length 
        const refunds = todayTickets.filter(t => 
            t.status === 'CANCELLED' || 
            t.status === 'REFUNDED' || 
            (t.exitTime && (t.amountPaid === 0 || t.amountPaid === null))
        )

        const totalCashIn = todayTickets.reduce((acc, t) => acc + (t.amountPaid || 0), 0)

        // Find Cash Sessions for today
        const activeSessions = await prisma.cashSession.findMany({
            where: {
                tenantId: tid,
                status: 'OPEN'
            },
            include: {
                user: true
            }
        })

        return NextResponse.json({
            divergence: {
                totalTickets: totalEntries,
                refundVouchers: refunds.length,
                prepaidApproves: prepaidCount,
                alertLevel: refunds.length > 5 ? 'HIGH' : refunds.length > 0 ? 'MEDIUM' : 'LOW'
            },
            activeSessions: activeSessions.map(s => ({
                id: s.id,
                operator: s.user?.name || 'Desconhecido',
                openedAt: (s as any).openedAt || (s as any).startTime,
                currentBalance: (s as any).currentBalance || (s as any).startBalance
            }))
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
