
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

import bcrypt from 'bcryptjs'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const admin = await prisma.sysAdmin.findUnique({
            where: { id },
            select: { id: true, name: true, email: true } // omitting password
        })
        if (!admin) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        return NextResponse.json(admin)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const body = await request.json()

        let passwordHash = undefined
        if (body.password) {
            passwordHash = bcrypt.hashSync(body.password, 10)
        }

        const updated = await prisma.sysAdmin.update({
            where: { id },
            data: {
                name: body.name,
                email: body.email,
                password: passwordHash
            }
        })
        return NextResponse.json(updated)
    } catch (error) {
        return NextResponse.json({ error: 'Update Failed' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        await prisma.sysAdmin.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Delete Failed' }, { status: 500 })
    }
}
