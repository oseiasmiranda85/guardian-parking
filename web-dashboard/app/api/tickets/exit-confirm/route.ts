
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { ticketId, tenantId } = body

        if (!ticketId || !tenantId) {
            return NextResponse.json({ error: 'Ticket ID e Tenant ID são obrigatórios.' }, { status: 400 })
        }

        const tid = parseInt(tenantId)
        const id = parseInt(ticketId)

        // Find the ticket first to ensure it belongs to the tenant
        const ticket = await prisma.ticket.findUnique({
            where: { id }
        })

        if (!ticket || ticket.tenantId !== tid) {
            return NextResponse.json({ error: 'Ticket não encontrado.' }, { status: 404 })
        }

        if (ticket.exitTime) {
            return NextResponse.json({ error: 'Este ticket já registrou saída.' }, { status: 400 })
        }

        // Update the ticket
        const updatedTicket = await prisma.ticket.update({
            where: { id },
            data: {
                exitTime: new Date(),
                status: 'EXITED'
            }
        })

        return NextResponse.json({
            message: 'Saída confirmada com sucesso.',
            ticket: updatedTicket
        })

    } catch (error: any) {
        console.error("Exit Confirm Error", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
