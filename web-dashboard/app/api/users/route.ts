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

        // 1. Get Current Tenant's Owner
        const currentTenant = await prisma.tenant.findUnique({
            where: { id: tid },
            select: { ownerId: true }
        })

        if (!currentTenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
        }

        // 2. Check if username/email exists ANYWHERE
        const existingGlobal = await prisma.tenantUser.findFirst({
            where: { username: email },
            include: { tenant: true }
        })

        if (existingGlobal) {
            // Check if it belongs to the same owner
            if (existingGlobal.tenant.ownerId === currentTenant.ownerId) {
                // USER BELONGS TO THE SAME OWNER - PERMIT LINKING
                // Check if already in THIS specific tenant
                const alreadyInTenant = await prisma.tenantUser.findFirst({
                    where: { username: email, tenantId: tid }
                })

                if (alreadyInTenant) {
                    return NextResponse.json({ error: 'Este usuário já está habilitado nesta unidade.' }, { status: 409 })
                }

                // Create the link (cloning password and basic info)
                const linkedUser = await prisma.tenantUser.create({
                    data: {
                        name: existingGlobal.name,
                        username: email,
                        role: role,
                        password: existingGlobal.password, // SHARED PASSWORD
                        pin: pin || existingGlobal.pin,
                        tenantId: tid
                    }
                })

                return NextResponse.json({
                    id: linkedUser.id,
                    name: linkedUser.name,
                    email: linkedUser.username,
                    role: linkedUser.role,
                    linked: true // Flag for UI
                })
            } else {
                // Different owner - Forbidden
                return NextResponse.json({ error: 'Este nome de usuário já está em uso por outro cliente do sistema.' }, { status: 409 })
            }
        }

        // 3. Normal Creation (First time in the network)
        const newUser = await prisma.tenantUser.create({
            data: {
                name,
                username: email,
                role,
                password: bcrypt.hashSync(password || '123456', 10),
                pin: pin || null,
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
