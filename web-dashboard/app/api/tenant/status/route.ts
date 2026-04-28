import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    try {
        const subscription = await prisma.subscription.findUnique({
            where: { tenantId: parseInt(tenantId) }
        })

        if (!subscription) {
            return NextResponse.json({ status: 'UNKNOWN' })
        }

        return NextResponse.json({
            status: subscription.status,
            validUntil: subscription.validUntil
        })

    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
