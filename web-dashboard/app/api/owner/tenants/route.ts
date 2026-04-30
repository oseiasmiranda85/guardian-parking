import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json({ error: 'TenantId required' }, { status: 400 })

        const currentTenant = await prisma.tenant.findUnique({
            where: { id: parseInt(tenantId) },
            select: { ownerId: true }
        })

        if (!currentTenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

        const tenants = await prisma.tenant.findMany({
            where: { ownerId: currentTenant.ownerId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(tenants)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
