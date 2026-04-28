import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secure-key-123')

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const login = body.login || body.email
        const { password, deviceId } = body

        let userFn = null
        let role = ''
        let type = ''
        let tenantId = null

        // 1. Try Admin
        const admin = await prisma.sysAdmin.findUnique({ where: { email: login } })
        if (admin) {
            // Check Hash
            const isValid = bcrypt.compareSync(password, admin.password)
            if (isValid) {
                userFn = admin
                role = 'MASTER'
                type = 'ADMIN'
            }
        }

        // 2. Try Tenant User (Only if not admin found)
        if (!userFn) {
            const tenantUser = await prisma.tenantUser.findFirst({ where: { username: login } })
            if (tenantUser) {
                const isValid = bcrypt.compareSync(password, tenantUser.password)
                if (isValid) {
                    userFn = tenantUser
                    role = tenantUser.role
                    tenantId = tenantUser.tenantId
                    type = 'TENANT'
                }
            }
        }

        if (!userFn) {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
        }

        // 3. Check for Open Sessions (ONLY for Tenant Users, as Admins are global)
        if (type === 'TENANT') {
            const openSession = await prisma.cashSession.findFirst({
                where: {
                    userId: userFn.id,
                    status: 'OPEN'
                }
            })

            // BLOCK only if trying to login from a DIFFERENT device
            if (openSession && openSession.deviceId && openSession.deviceId !== deviceId) {
                console.warn(`[AUTH] Login blocked for user ${userFn.id}: Open session ${openSession.id} on DIFFERENT device ${openSession.deviceId} (Current: ${deviceId})`)
                return NextResponse.json({ 
                    error: `CAIXA ABERTO: Você já possui um caixa aberto no terminal ${openSession.deviceId}. Encerre o turno lá antes de trocar de terminal.` 
                }, { status: 403 })
            }
        }

        // If Admin, they might not have a tenantId. 
        // For App usage, we assign the first available tenant as context.
        if (type === 'ADMIN' && !tenantId) {
            const firstTenant = await prisma.tenant.findFirst()
            if (firstTenant) {
                tenantId = firstTenant.id
            }
        }

        // Generate JWT
        const token = await new SignJWT({
            id: userFn.id,
            name: userFn.name,
            role,
            type,
            tenantId
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(JWT_SECRET)

        // Create Response with Cookie (Hybrid for Web and Android)
        const userObj = {
            id: userFn.id,
            name: userFn.name,
            email: (userFn as any).email || (userFn as any).username || login,
            role: role,
            type: type
        }

        const responseData = {
            token,
            ...userObj, // Flat for Web
            user: userObj, // Nested for Android
            tenant: {
                id: tenantId || 0,
                name: "Estacionamento"
            }
        }

        // Fetch real tenant name if possible
        if (tenantId) {
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
            if (tenant) {
                responseData.tenant.name = tenant.name
            }
        }

        const response = NextResponse.json(responseData)

        response.cookies.set('guardian_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        })

        return response

    } catch (error) {
        console.error("Login Error", error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
