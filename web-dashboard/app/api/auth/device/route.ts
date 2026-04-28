import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body // 'email' usually comes from the form, but matches 'username' in DB

        if (!email || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
        }

        // 1. Find TenantUser (using generic username field)
        const user = await prisma.tenantUser.findFirst({
            where: { username: email }, // client sends 'email' param, we check 'username' column
            include: {
                tenant: {
                    include: {
                        subscription: true
                    }
                }
            }
        })

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // 2. Check Tenant Status
        const subStatus = user.tenant.subscription?.status

        // If subscription exists, check if blocked.
        // If NO subscription, we might allow (or block depending on business rule). 
        // Assuming free tier or active by default if not strictly forced.
        // However, schema has Subscription optional.
        if (user.tenant.subscription) {
            if (subStatus === 'BLOCKED' || subStatus === 'CANCELED' || subStatus === 'PENDING') {
                return NextResponse.json({
                    error: 'ACCESS_DENIED_PAYMENT',
                    message: `Establishment is ${subStatus || 'Invalid'}. Please contact support.`
                }, { status: 403 })
            }
        }

        // 3. Return Token & Context
        return NextResponse.json({
            token: `mock-jwt-${user.id}-${Date.now()}`,
            user: {
                id: user.id,
                name: user.name,
                role: user.role // 'MANAGER' or 'OPERATOR'
            },
            tenant: {
                id: user.tenant.id,
                name: user.tenant.name,
                status: subStatus || 'ACTIVE'
            }
        })

    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
