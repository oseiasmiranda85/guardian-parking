
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const user = await prisma.tenantUser.findUnique({
            where: { id },
            select: { id: true, name: true, username: true, role: true, pin: true }
        })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        
        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.username,
            role: user.role,
            pin: user.pin
        })
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        const body = await request.json()
        const { name, email, role, password, pin } = body

        let updateData: any = { name }
        if (email) updateData.username = email
        if (role) updateData.role = role
        if (pin !== undefined) updateData.pin = pin
        if (password) {
            updateData.password = bcrypt.hashSync(password, 10)
        }

        const updated = await prisma.tenantUser.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({
            id: updated.id,
            name: updated.name,
            email: updated.username,
            role: updated.role,
            hasPin: !!updated.pin,
            hidden: false
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        await prisma.tenantUser.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
