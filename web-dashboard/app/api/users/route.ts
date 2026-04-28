import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json([], { status: 400 })

        const tid = parseInt(tenantId)

        // Fetch Tenant Users
        const users = await prisma.tenantUser.findMany({
            where: { tenantId: tid },
            orderBy: { name: 'asc' }
        })

        // Map to frontend expected format
        const mappedUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            email: u.username, // Using username as email/login
            hidden: false,
            hasPin: !!u.pin
        }))


        return NextResponse.json(mappedUsers)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, role, password, pin, tenantId } = body

        if (!name || !email || !role || !tenantId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const tid = parseInt(tenantId)

        // Check if username/email exists
        const existing = await prisma.tenantUser.findFirst({
            where: { username: email }
        })

        if (existing) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
        }

        const newUser = await prisma.tenantUser.create({
            data: {
                name,
                username: email,
                role,
                password: bcrypt.hashSync(password || '123456', 10),
                pin: pin || null,               // Numerical PIN for POS
                tenantId: tid
            }
        })

        return NextResponse.json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.username,
            role: newUser.role,
            hidden: false
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
