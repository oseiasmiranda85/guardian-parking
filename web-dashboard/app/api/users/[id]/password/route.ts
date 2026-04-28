
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

        // Update User
        await prisma.tenantUser.update({
            where: { id },
            data: { password: hashedPassword }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
