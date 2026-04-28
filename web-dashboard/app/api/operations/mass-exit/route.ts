
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')
        if (!tenantId) return NextResponse.json({ count: 0 })

        const count = await prisma.ticket.count({
            where: {
                tenantId: parseInt(tenantId),
                status: { in: ['OPEN', 'PAID'] }
            }
        })

        return NextResponse.json({ count })
    } catch (error) {
        return NextResponse.json({ count: 0 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tenantId } = body

        if (!tenantId) return NextResponse.json({ error: 'Tenant Required' }, { status: 400 })

        const result = await prisma.ticket.updateMany({
            where: {
                tenantId: parseInt(tenantId),
                status: { in: ['OPEN', 'PAID'] }
            },
            data: {
                status: 'EXITED', // "Fora do Pátio"
                exitTime: new Date()
                // Duration is dynamically calculated (Exit - Entry)
                // Payment is NOT processed here (POS only)
            }
        })

        return NextResponse.json({ success: true, count: result.count })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
