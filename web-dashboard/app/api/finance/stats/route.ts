
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json([], { status: 400 })
        const tid = parseInt(tenantId)

        const now = new Date()

        // 1. Fetch Transactions (Paid)
        const transactions = await prisma.transaction.findMany({
            where: {
                tenantId: tid,
                amount: { gt: 0 } // Income only
            },
            include: {
                ticket: true
            }
        })

        // 2. Fetch Active Vehicles (Open Tickets)
        const activeCount = await prisma.ticket.count({
            where: { tenantId: tid, status: 'OPEN' }
        })

        // 2.5 Fetch Exemptions (Courtesy/Accredited)
        const exemptionTickets = await prisma.ticket.findMany({
            where: {
                tenantId: tid,
                ticketType: { in: ['CORTESIA', 'ACCREDITED', 'CREDENCIADO'] }
            }
        })

        // Fetch active pricing for base price calculation
        const activePricing = await prisma.pricingTable.findFirst({
            where: { tenantId: tid, isActive: true },
            include: { slots: { orderBy: { minMinutes: 'asc' }, take: 1 } }
        })
        const basePrice = activePricing?.slots[0]?.price || 10.0

        const courtesyCount = exemptionTickets.filter(t => t.ticketType === 'CORTESIA').length
        const accreditedCount = exemptionTickets.filter(t => t.ticketType !== 'CORTESIA').length
        const renouncedRevenue = (courtesyCount + accreditedCount) * basePrice

        // 3. Process Data for Charts

        // --- Revenue by Hour (Today) ---
        const revenueByHourMap = new Map()
        // Initialize 00:00 to 23:00
        for (let i = 0; i < 24; i++) {
            const h = i.toString().padStart(2, '0') + ':00'
            revenueByHourMap.set(h, { hour: h, amount: 0, vehicles: 0 })
        }

        const today = now.toISOString().split('T')[0]

        transactions.forEach(t => {
            const tDate = t.createdAt.toISOString().split('T')[0]
            if (tDate === today) {
                const h = t.createdAt.getHours().toString().padStart(2, '0') + ':00'
                const entry = revenueByHourMap.get(h)
                if (entry) {
                    entry.amount += t.amount
                    entry.vehicles += 1
                }
            }
        })
        const revenueByHour = Array.from(revenueByHourMap.values())

        // --- Payment Methods (Translated) ---
        const paymentMap: any = {}
        const methodTranslations: any = {
            'CASH': 'DINHEIRO',
            'CREDIT': 'CRÉDITO',
            'DEBIT': 'DÉBITO',
            'PIX': 'PIX'
        }

        transactions.forEach(t => {
            const rawMethod = t.method
            const method = methodTranslations[rawMethod] || rawMethod
            if (!paymentMap[method]) paymentMap[method] = { name: method, value: 0, count: 0, color: getColor(rawMethod) }
            paymentMap[method].value += t.amount
            paymentMap[method].count += 1
        })
        const paymentMethods = Object.values(paymentMap)

        // --- Vehicle Types Separation ---
        const vehicleMap: any = {}
        const typeTranslations: any = {
            'CAR': 'CARROS',
            'MOTORCYCLE': 'MOTOS',
            'MOTO': 'MOTOS',
            'VAN': 'UTILITÁRIOS',
            'TRUCK': 'CAMINHÕES'
        }

        transactions.forEach(t => {
            const rawType = t.ticket?.vehicleType || 'CAR'
            const type = typeTranslations[rawType] || 'CARROS'
            if (!vehicleMap[type]) vehicleMap[type] = { 
                name: type, 
                value: 0, 
                count: 0, 
                color: rawType.includes('MOTO') ? '#8b5cf6' : '#3b82f6' 
            }
            vehicleMap[type].value += t.amount
            vehicleMap[type].count += 1
        })
        const vehicleTypes = Object.values(vehicleMap)

        // --- KPI Totals ---
        const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0)
        const totalVehicles = transactions.length // Using transactions for paid count

        // --- Weekly Flow (Last 7 days) ---
        const weeklyMap = new Map()
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' })
            const key = d.toISOString().split('T')[0]
            weeklyMap.set(key, { day: dayName, vehicles: 0, date: key })
        }

        // Re-fetch tickets for flow stats
        const allTickets = await prisma.ticket.findMany({
            where: { tenantId: tid },
            select: { entryTime: true }
        })

        allTickets.forEach(t => {
            const dateStr = t.entryTime.toISOString().split('T')[0]
            if (weeklyMap.has(dateStr)) {
                weeklyMap.get(dateStr).vehicles += 1
            }
        })
        const weeklyFlow = Array.from(weeklyMap.values())


        return NextResponse.json({
            revenueByHour,
            paymentMethods: paymentMethods.length ? paymentMethods : [{ name: 'N/A', value: 0, count: 0, color: '#ccc' }],
            vehicleTypes: vehicleTypes.length ? vehicleTypes : [{ name: 'Geral', value: 0, count: 0, color: '#3b82f6' }],
            weeklyFlow,
            kpi: {
                totalRevenue,
                totalVehicles,
                ticketAvg: totalVehicles ? totalRevenue / totalVehicles : 0,
                occupancy: activeCount,
                renouncedRevenue,
                courtesyCount,
                accreditedCount
            }
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function getColor(method: string) {
    switch (method) {
        case 'CASH': return '#ef4444'; // red-ish
        case 'CREDIT': return '#3b82f6'; // blue
        case 'DEBIT': return '#8b5cf6'; // purple
        case 'PIX': return '#22c55e'; // green
        default: return '#9ca3af';
    }
}
