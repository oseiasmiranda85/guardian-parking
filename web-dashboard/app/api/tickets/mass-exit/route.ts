
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tenantId, operatorId } = body

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID Required' }, { status: 400 })
        }

        const tid = parseInt(tenantId)

        // 1. Find all OPEN tickets
        const openTickets = await prisma.ticket.findMany({
            where: {
                tenantId: tid,
                status: 'OPEN'
            }
        })

        if (openTickets.length === 0) {
            return NextResponse.json({ message: 'Nenhum ticket aberto para encerrar.', count: 0 })
        }

        const exitTime = new Date()

        // 2. Close them in a transaction (Limit batch size if needed, but 400-500 is fine)
        // We will mark them as EXITED. 
        // If they are POST-PAID and unpaid, this effectively waives them or assumes cash collected manually outside.
        // For "Mass Exit" usually it's "Clear the Lot".

        // Update Many
        const updateResult = await prisma.ticket.updateMany({
            where: {
                tenantId: tid,
                status: 'OPEN'
            },
            data: {
                status: 'EXITED',
                exitTime: exitTime,
                exitOperatorId: operatorId || null,
                amountPaid: 0, // Assuming cleared/waived or paid manually. 
                // If we want to calculate price for each, we'd need a loop. 
                // Creating transactions for 400 items loop is better for financial accuracy but slow.
                // For MVP Mass Exit: Force Close.
            }
        })

        return NextResponse.json({
            success: true,
            message: `${updateResult.count} veículos liberados com sucesso.`,
            count: updateResult.count
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
