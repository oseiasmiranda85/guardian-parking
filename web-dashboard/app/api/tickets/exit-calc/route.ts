
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { ticketId, plate, tenantId } = body

        if (!tenantId) return NextResponse.json({ error: 'Tenant ID Required' }, { status: 400 })

        // 1. Find Ticket
        let ticket = null
        if (ticketId) {
            ticket = await prisma.ticket.findUnique({
                where: { id: parseInt(ticketId) }
            })
        } else if (plate) {
            ticket = await prisma.ticket.findFirst({
                where: {
                    plate: plate.toUpperCase(),
                    tenantId: parseInt(tenantId),
                    status: 'OPEN'
                }
            })
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket não encontrado ou já encerrado.' }, { status: 404 })
        }

        // 2. Logic for ACCREDITED / EVENT
        if (ticket.ticketType === 'ACCREDITED') {
            return NextResponse.json({
                ticketId: ticket.id,
                plate: ticket.plate,
                entryTime: ticket.entryTime,
                exitTime: new Date(),
                duration: 'N/A (Credenciado)',
                price: 0,
                tableName: 'Credenciado / Isento',
                status: 'READY_TO_EXIT'
            })
        }

        // 3. Calculate Duration
        const now = new Date()
        const entryTime = new Date(ticket.entryTime)

        // Difference in minutes
        const diffMs = now.getTime() - entryTime.getTime()
        const minutes = Math.floor(diffMs / 60000)

        // Duration String
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        const durationStr = `${hours}h ${mins}m`

        // Extract vehicleType from entryMethod (e.g. MANUAL_CAR -> CAR)
        const vTypeMatch = ticket.entryMethod ? ticket.entryMethod.split('_') : []
        const vehicleType = vTypeMatch.length > 1 ? vTypeMatch[vTypeMatch.length - 1] : 'CAR'

        // 4. Find Active Pricing Table based on vehicleType
        const pricingTable = await prisma.pricingTable.findFirst({
            where: {
                tenantId: parseInt(tenantId),
                isActive: true,
                vehicleType: vehicleType
            },
            include: { slots: { orderBy: { minMinutes: 'asc' } } }
        })

        if (!pricingTable) {
            // Fallback if no table: Charge 0 or standard fee?
            // Let's return error to prompt manager to config
            return NextResponse.json({ error: 'Nenhuma Tabela de Preços Ativa! Configure no menu Tabela de Preços.' }, { status: 400 })
        }

        // 5. Apply Rules
        let finalPrice = 0
        let matchedSlot = null

        // Strategy: Find the slot where min <= minutes <= max
        // If minutes > last max, use last max (or special logic if needed)

        if (pricingTable.type === 'FIXED_TIME' || pricingTable.billingMode === 'PREPAID') {
            // Check Tolerance for Refund
            const toleranceMin = pricingTable.slots.length > 0 && pricingTable.slots[0].price === 0 ? pricingTable.slots[0].maxMinutes : 0
            
            if (minutes <= toleranceMin) {
                // TOLERANCE REACHED! Estorno.
                return NextResponse.json({
                    ticketId: ticket.id,
                    plate: ticket.plate,
                    entryTime: ticket.entryTime,
                    exitTime: now,
                    duration: durationStr,
                    durationMinutes: minutes,
                    price: 0,
                    tableName: pricingTable.name,
                    pricingTableId: pricingTable.id,
                    isPrepaidRefund: true,
                    message: `TOLERÂNCIA ATINGIDA (${minutes} min). ESTORNO INTEGRAL NECESSÁRIO.`
                })
            }

            // Normal Flow for Prepaid Exit (already paid, price is 0 to leave)
            if (pricingTable.slots.length > 0) {
                finalPrice = 0 // In prepaid real world, the gate just opens once verified it's paid. But logically the price of the ticket was already collected.
                matchedSlot = pricingTable.slots.length > 1 ? pricingTable.slots[1] : pricingTable.slots[0]
            }
        } else {
            // DURATION LOGIC (POST-PAID)

        // DURATION LOGIC
        for (const slot of pricingTable.slots) {
            if (minutes >= slot.minMinutes && minutes <= slot.maxMinutes) {
                finalPrice = slot.price
                matchedSlot = slot
                break
            }
        }

        // If no slot matched (e.g. exceeded max), take the last one or accumulate
        if (!matchedSlot && pricingTable.slots.length > 0) {
            const lastSlot = pricingTable.slots[pricingTable.slots.length - 1]
            if (minutes > lastSlot.maxMinutes) {
                finalPrice = lastSlot.price
            }
        }
        } // Close else for DURATION LOGIC

        // (Duration String logic moved up)

        return NextResponse.json({
            ticketId: ticket.id,
            plate: ticket.plate,
            entryTime: ticket.entryTime,
            exitTime: now,
            duration: durationStr,
            durationMinutes: minutes,
            price: finalPrice,
            tableName: pricingTable.name,
            pricingTableId: pricingTable.id
        })

    } catch (error: any) {
        console.error("Calc Error", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
