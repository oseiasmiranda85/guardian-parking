
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { pin, tenantId } = body

        if (!pin || !tenantId) {
            return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 })
        }

        const user = await prisma.tenantUser.findFirst({
            where: {
                tenantId: parseInt(tenantId),
                pin: pin,
                role: { in: ['MANAGER', 'SUPERVISOR', 'MASTER'] }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'PIN Inválido ou sem permissão' }, { status: 401 })
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        })

    } catch (error) {
        return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 })
    }
}
