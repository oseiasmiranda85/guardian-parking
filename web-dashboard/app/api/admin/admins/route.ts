
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { hash } from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const admins = await prisma.sysAdmin.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(admins)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, password } = body

        const admin = await prisma.sysAdmin.create({
            data: {
                name,
                email,
                password: await hash(password || '123456', 10) // Hashed for security
            }
        })
        return NextResponse.json(admin)
    } catch (error) {
        return NextResponse.json({ error: 'Creation Failed' }, { status: 500 })
    }
}
