import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id

        const session = await prisma.cashSession.findUnique({
            where: { id }
        })

        if (!session) {
            return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
        }

        if (session.status === 'CLOSED') {
            return NextResponse.json({ error: 'Sessão já está fechada' }, { status: 400 })
        }

        // Close the session
        const updated = await prisma.cashSession.update({
            where: { id },
            data: {
                status: 'CLOSED',
                endTime: new Date(),
                // If closing remotely, we might not have the final balance, 
                // but we can mark it as closed.
            }
        })

        return NextResponse.json({ success: true, session: updated })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
