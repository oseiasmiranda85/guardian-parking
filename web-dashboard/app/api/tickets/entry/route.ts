
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            plate,
            tenantId,
            vehicleType,
            helmetCount,
            entryMethod,
            ticketType, // 'ROTATIVO' | 'ACCREDITED'
            payment,
            operatorId // NEW
        } = body

        if (!tenantId) return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })

        // Check availability
        const existing = await prisma.ticket.findFirst({
            where: {
                plate: plate.toUpperCase(),
                tenantId: parseInt(tenantId),
                status: 'OPEN' // Active ticket
            }
        })

        if (existing) {
            // Rule: Accredited check double entry
            const msg = ticketType === 'ACCREDITED'
                ? `ACESSO NEGADO: Veículo Credenciado [${plate}] já consta como ESTACIONADO.`
                : 'Veículo já está no pátio!'
            return NextResponse.json({ error: msg }, { status: 409 })
        }

        // Create Ticket
        const ticket = await prisma.ticket.create({
            data: {
                tenantId: parseInt(tenantId),
                plate: plate.toUpperCase(),
                entryTime: new Date(),
                // If Accredited, it's effectively "PAID" (amount 0) but we keep OPEN to track exit time.
                // Or maybe PAID if free? Usually standard is OPEN until exit.
                status: 'OPEN',
                ticketType: ticketType || 'ROTATIVO',
                helmetCount: parseInt(helmetCount) || 0,
                entryMethod: `${entryMethod || 'MANUAL'}_${vehicleType || 'CAR'}`,
                entryOperatorId: operatorId ? parseInt(operatorId) : null
            }
        })

        // Financial Transaction
        if (ticketType === 'ACCREDITED') {
            await prisma.transaction.create({
                data: {
                    tenantId: parseInt(tenantId),
                    ticketId: ticket.id,
                    amount: 0,
                    method: 'CREDENTIAL',
                    operatorId: operatorId ? parseInt(operatorId) : null,
                    createdAt: new Date()
                }
            })
        } else if (payment && payment.amount > 0) {
            // Standard Pay-to-Enter
            await prisma.transaction.create({
                data: {
                    tenantId: parseInt(tenantId),
                    ticketId: ticket.id,
                    amount: parseFloat(payment.amount),
                    method: payment.method,
                    operatorId: operatorId ? parseInt(operatorId) : null,
                    createdAt: new Date()
                }
            })
        }

        return NextResponse.json(ticket)

    } catch (error: any) {
        console.error("Entry Error", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
