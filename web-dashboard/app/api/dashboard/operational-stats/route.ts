
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
        }

        let tenantIdsQuery: any = {}
        let capacity = 0
        let tenantName = 'Visão Consolidada (Geral)'

        let courtesyThreshold = 5.0

        if (tenantId.startsWith('ALL_')) {
            const ownerId = parseInt(tenantId.split('_')[1])
            const tenants = await prisma.tenant.findMany({ where: { ownerId }, select: { id: true, totalSpots: true, courtesyThreshold: true } })
            const tIds = tenants.map(t => t.id)
            tenantIdsQuery = { in: tIds }
            capacity = tenants.reduce((acc, t) => acc + (t.totalSpots || 0), 0)
            courtesyThreshold = tenants[0]?.courtesyThreshold || 5.0
        } else {
            const tid = parseInt(tenantId)
            tenantIdsQuery = tid
            const tenant = await prisma.tenant.findUnique({ where: { id: tid }, select: { name: true, totalSpots: true, courtesyThreshold: true } })
            capacity = tenant?.totalSpots || 0
            tenantName = tenant?.name || 'Estacionamento'
            courtesyThreshold = tenant?.courtesyThreshold || 5.0
        }

        // --- BRAZIL UTC-3 OFFSET LOGIC ---
        // We define "Today" as 03:00 UTC of current day to 02:59 UTC of next day
        const getBrazilRange = (dateStr?: string) => {
            let baseDate = new Date()
            if (dateStr) {
                const [y, m, d] = dateStr.split('-').map(Number)
                baseDate = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0))
            } else {
                // If late at night (after 21:00 Local / 00:00 UTC), 
                // new Date() is already tomorrow UTC.
                // We want 00:00 of the CURRENT LOCAL day.
                baseDate.setMinutes(baseDate.getMinutes() - baseDate.getTimezoneOffset()) // Sync to local
                baseDate.setUTCHours(3, 0, 0, 0)
            }
            const start = new Date(baseDate)
            start.setUTCHours(3, 0, 0, 0)
            const end = new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1)
            return { start, end }
        }

        let { start: filterStart, end: filterEnd } = getBrazilRange()

        if (startDateParam && endDateParam) {
            const rangeStart = getBrazilRange(startDateParam).start
            const rangeEnd = getBrazilRange(endDateParam).end
            filterStart = rangeStart
            filterEnd = rangeEnd
        }

        // 1. Occupancy (Live - Always CURRENT state)
        // Count OPEN or PAID tickets (still in lot)
        const openTickets = await prisma.ticket.count({
            where: {
                tenantId: tenantIdsQuery,
                exitTime: null
            }
        })

        // 2. Revenue (Filtered by date)
        console.log(`[STATS-API] Querying Revenue: tid=${JSON.stringify(tenantIdsQuery)}, start=${filterStart.toISOString()}, end=${filterEnd.toISOString()}`)
        const transactionsRange = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                tenantId: tenantIdsQuery,
                createdAt: { gte: filterStart, lte: filterEnd }
            }
        })
        const revenueTotal = transactionsRange._sum.amount || 0
        console.log(`[STATS-API] Revenue Total: ${revenueTotal}`)

        // 3. Inflow (Filtered by date)
        const entriesRange = await prisma.ticket.count({
            where: {
                tenantId: tenantIdsQuery,
                entryTime: { gte: filterStart, lte: filterEnd }
            }
        })

        // 4. Average Ticket
        const avgTicket = entriesRange > 0 ? (revenueTotal / entriesRange) : 0

        // 5. Payment Methods
        const paymentsByMethod = await prisma.transaction.groupBy({
            by: ['method'],
            where: {
                tenantId: tenantIdsQuery,
                createdAt: { gte: filterStart, lte: filterEnd }
            },
            _sum: { amount: true }
        })

        const byPaymentMethod = paymentsByMethod.map(p => ({
            method: p.method,
            total: p._sum.amount || 0
        }))

        // 6. Vehicle Types
        const vehiclesByType = await prisma.vehicle.groupBy({
            by: ['type'],
            where: { tenantId: tenantIdsQuery },
            _count: { id: true }
        })

        // 7. Courtesy and Accredited Metrics (Renounced Revenue)
        const ticketsDetails = await prisma.ticket.findMany({
            where: {
                tenantId: tenantIdsQuery,
                entryTime: { gte: filterStart, lte: filterEnd }
            },
            select: { ticketType: true, amountPaid: true, pricingTableId: true }
        })

        const courtesyTickets = ticketsDetails.filter(t => t.ticketType === 'CORTESIA')
        const accreditedTickets = ticketsDetails.filter(t => t.ticketType === 'ACCREDITED' || t.ticketType === 'CREDENCIADO')
        
        // Fetch representative price for renounced revenue calculation
        // We'll take the first hour price from the main active pricing table
        const activePricing = await prisma.pricingTable.findFirst({
            where: { tenantId: tenantIdsQuery, isActive: true },
            include: { slots: { orderBy: { minMinutes: 'asc' }, take: 1 } }
        })
        const basePrice = activePricing?.slots[0]?.price || 10.0 // Fallback to 10 if no pricing found

        const renouncedRevenueCourtesy = courtesyTickets.length * basePrice
        const renouncedRevenueAccredited = accreditedTickets.length * basePrice
        const totalRenouncedRevenue = renouncedRevenueCourtesy + renouncedRevenueAccredited

        // 8. Prepaid Approves (for Audit panel)
        const prepaidTransactions = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                tenantId: tenantIdsQuery,
                createdAt: { gte: filterStart, lte: filterEnd },
                method: { not: 'CORTESIA' } // Exclude courtesy even if zero
            }
        })
        const prepaidApproves = prepaidTransactions._sum.amount || 0

        // 9. Hourly Heatmap (Grouped by hour)
        const ticketsInRange = await prisma.ticket.findMany({
            where: {
                tenantId: tenantIdsQuery,
                entryTime: { gte: filterStart, lte: filterEnd }
            },
            select: { entryTime: true }
        })

        const hourlyDistribution = Array(24).fill(0)
        ticketsInRange.forEach(t => {
            const h = t.entryTime.getHours()
            hourlyDistribution[h]++
        })

        return NextResponse.json({
            tenantName,
            occupancy: {
                current: openTickets,
                total: capacity,
                available: Math.max(0, capacity - openTickets),
                percentage: capacity > 0 ? Math.round((openTickets / capacity) * 100) : 0
            },
            financial: {
                revenueToday: revenueTotal,
                ticketAverage: avgTicket,
                byPaymentMethod
            },
            flow: {
                entriesToday: entriesRange,
                byVehicleType: vehiclesByType,
                hourlyDistribution,
                courtesyCount: courtesyTickets.length,
                accreditedCount: accreditedTickets.length,
                courtesyPercentage: entriesRange > 0 ? (courtesyTickets.length / entriesRange) * 100 : 0,
                courtesyThreshold
            },
            audit: {
                prepaidApproves
            },
            exemptions: {
                courtesy: renouncedRevenueCourtesy,
                accredited: renouncedRevenueAccredited,
                total: totalRenouncedRevenue
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
