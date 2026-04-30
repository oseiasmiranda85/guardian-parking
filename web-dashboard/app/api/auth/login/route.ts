import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secure-key-123')

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const login = body.login || body.email
        const { password, deviceId, selectedTenantId } = body

        let userFn = null
        let role = ''
        let type = ''
        let tenantId = selectedTenantId

        // 1. Try Admin
        const admin = await prisma.sysAdmin.findUnique({ where: { email: login } })
        if (admin) {
            const isValid = bcrypt.compareSync(password, admin.password)
            if (isValid) {
                userFn = admin
                role = 'MASTER'
                type = 'ADMIN'
            }
        }

        // 2. Try Tenant User
        if (!userFn) {
            const tenantUsers = await prisma.tenantUser.findMany({ 
                where: { username: login },
                include: { tenant: true }
            })
            
            if (tenantUsers.length === 0) {
                return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
            }

            // Check passwords for all matches (usually same across units)
            const validUsers = tenantUsers.filter(u => bcrypt.compareSync(password, u.password))
            
            if (validUsers.length === 0) {
                return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
            }

            // MULTI-TENANT LOGIC
            if (validUsers.length > 1 && !selectedTenantId) {
                return NextResponse.json({
                    status: 'MULTIPLE_TENANTS',
                    tenants: validUsers.map(u => ({
                        id: u.tenant.id,
                        name: u.tenant.name
                    }))
                })
            }

            // Pick the specific one or the only one
            const targetUser = selectedTenantId 
                ? validUsers.find(u => u.tenantId === parseInt(selectedTenantId))
                : validUsers[0]

            if (!targetUser) {
                return NextResponse.json({ error: 'Estabelecimento não vinculado ao usuário' }, { status: 403 })
            }

            userFn = targetUser
            role = targetUser.role
            tenantId = targetUser.tenantId
            type = 'TENANT'
        }

        if (!userFn) {
            return NextResponse.json({ error: 'Erro de autenticação' }, { status: 401 })
        }

        // 3. Check for Open Sessions
        if (type === 'TENANT') {
            const openSession = await prisma.cashSession.findFirst({
                where: {
                    userId: userFn.id,
                    status: 'OPEN'
                }
            })

            if (openSession && openSession.deviceId && openSession.deviceId !== deviceId) {
                return NextResponse.json({ 
                    error: `CAIXA ABERTO: Você já possui um caixa aberto no terminal ${openSession.deviceId}. Encerre o turno lá antes de trocar de terminal.` 
                }, { status: 403 })
            }
        }

        // If Admin, they might not have a tenantId. 
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

        // Fetch real tenant name
        let tenantName = "Estacionamento"
        if (tenantId) {
            const tenant = await prisma.tenant.findUnique({ where: { id: parseInt(tenantId.toString()) } })
            if (tenant) tenantName = tenant.name
        }

        const responseData = {
            token,
            user: {
                id: userFn.id,
                name: userFn.name,
                email: (userFn as any).email || (userFn as any).username || login,
                role: role,
                type: type
            },
            tenant: {
                id: tenantId || 0,
                name: tenantName
            }
        }

        const response = NextResponse.json(responseData)
        response.cookies.set('guardian_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24
        })

        return response

    } catch (error) {
        console.error("Login Error", error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
