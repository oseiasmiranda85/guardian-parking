
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { ticketId, amount, method, tenantId, operatorId } = body // Added operatorId

        if (!tenantId || !ticketId || amount === undefined) {
            return NextResponse.json({ error: 'Missing Data' }, { status: 400 })
        }

        // 1. Find Ticket
        const ticket = await prisma.ticket.findUnique({
            where: { id: parseInt(ticketId) }
        })

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
        }

        if (ticket.status === 'PAID' || ticket.status === 'EXITED') {
            return NextResponse.json({ error: 'Ticket já foi pago ou encerrado.' }, { status: 400 })
        }

        // 2. Perform Transaction & Update Ticket (Atomic)
        const result = await prisma.$transaction(async (tx) => {
            // Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    tenantId: parseInt(tenantId),
                    ticketId: ticket.id,
                    amount: parseFloat(amount),
                    method: method || 'CASH',
                    operatorId: operatorId ? parseInt(operatorId) : null
                }
            })

            // Update Ticket
            const updatedTicket = await tx.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: 'PAID', // Or 'EXITED' if gate opens immediately
                    exitTime: new Date(),
                    amountPaid: parseFloat(amount),
                    amountDue: parseFloat(amount),
                    exitOperatorId: operatorId ? parseInt(operatorId) : null
                }
            })

            return { transaction, updatedTicket }
        })

        return NextResponse.json(result)

    } catch (error: any) {
        console.error("Payment Error", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
