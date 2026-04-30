
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { hash } from 'bcryptjs'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }

        const body = await request.json()
        const { password } = body

        if (!password || password.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 chars' }, { status: 400 })
        }

        // Hash new password
        const hashedPassword = await hash(password, 10)

        // 1. Find the target user and their owner
        const targetUser = await prisma.tenantUser.findUnique({
            where: { id },
            include: { tenant: true }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        // 2. Update ALL instances of this username for the SAME OWNER
        // This ensures the password stays in sync across all establishments of the same owner
        await prisma.tenantUser.updateMany({
            where: {
                username: targetUser.username,
                tenant: {
                    ownerId: targetUser.tenant.ownerId
                }
            },
            data: { password: hashedPassword }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
