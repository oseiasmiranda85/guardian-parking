import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        
        const user = await prisma.tenantUser.findUnique({
            where: { id },
            select: { username: true, tenant: { select: { ownerId: true } } }
        })

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Find all TenantUser records with same username for this owner
        const links = await prisma.tenantUser.findMany({
            where: { 
                username: user.username,
                tenant: { ownerId: user.tenant.ownerId }
            },
            select: { tenantId: true }
        })

        return NextResponse.json(links.map(l => l.tenantId))

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        const body = await request.json()
        const { tenantIds } = body // Array of tenant IDs to be authorized

        const user = await prisma.tenantUser.findUnique({
            where: { id },
            include: { tenant: true }
        })

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const ownerId = user.tenant.ownerId
        const username = user.username

        // 1. Get current links for this owner
        const currentLinks = await prisma.tenantUser.findMany({
            where: { username, tenant: { ownerId } }
        })

        const currentTenantIds = currentLinks.map(l => l.tenantId)

        // 2. Add new links
        const toAdd = tenantIds.filter((tid: number) => !currentTenantIds.includes(tid))
        for (const tid of toAdd) {
            await prisma.tenantUser.create({
                data: {
                    name: user.name,
                    username: user.username,
                    password: user.password,
                    role: user.role,
                    pin: user.pin,
                    tenantId: tid
                }
            })
        }

        // 3. Remove links (only if they don't have transactions/sessions - or just ignore for now)
        // For safety, let's just allow unlinking if they don't have active sessions.
        const toRemove = currentTenantIds.filter(tid => !tenantIds.includes(tid))
        for (const tid of toRemove) {
             // Check for dependencies
             const hasHistory = await prisma.transaction.findFirst({ where: { operatorId: currentLinks.find(l => l.tenantId === tid)?.id } })
             const hasSessions = await prisma.cashSession.findFirst({ where: { userId: currentLinks.find(l => l.tenantId === tid)?.id } })
             
             if (!hasHistory && !hasSessions) {
                 await prisma.tenantUser.delete({
                     where: { id: currentLinks.find(l => l.tenantId === tid)?.id }
                 })
             } else {
                 // If has history, we could "deactivate" it but we don't have that flag yet.
                 // For now we just keep it.
             }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
