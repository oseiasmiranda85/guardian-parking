import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: parseInt(tenantId) },
            select: {
                id: true,
                globalAutoRelease: true,
                globalRequireExitTicket: true,
                defaultTicketLayout: true
            }
        })

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
        }

        return NextResponse.json(tenant)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { 
            tenantId, 
            globalAutoRelease, 
            globalRequireExitTicket, 
            defaultTicketLayout,
            applyToAll 
        } = body

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
        }

        // 1. Update Tenant Global Settings
        const updatedTenant = await prisma.tenant.update({
            where: { id: parseInt(tenantId) },
            data: {
                globalAutoRelease,
                globalRequireExitTicket,
                defaultTicketLayout
            }
        })

        // 2. If applyToAll is true, update all devices of this tenant
        if (applyToAll) {
            await prisma.device.updateMany({
                where: { tenantId: parseInt(tenantId) },
                data: {
                    autoRelease: globalAutoRelease,
                    requireExitTicket: globalRequireExitTicket,
                    ticketLayout: defaultTicketLayout
                }
            })
        }

        return NextResponse.json({ success: true, tenant: updatedTenant })
    } catch (error: any) {
        console.error('Error updating tenant settings:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
