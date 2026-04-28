
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json([], { status: 400 })

        const devices = await prisma.device.findMany({
            where: { tenantId: parseInt(tenantId) },
            orderBy: { lastPing: 'desc' }
        })

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const enrichedDevices = await Promise.all(devices.map(async d => {
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
            const isOnline = d.lastPing ? d.lastPing > fiveMinsAgo : false

            const entries = await prisma.ticket.count({
                where: {
                    tenantId: parseInt(tenantId),
                    entryEquipment: d.posId || d.id.toString(),
                    entryTime: { gte: todayStart }
                }
            })

            const exits = await prisma.ticket.count({
                where: {
                    tenantId: parseInt(tenantId),
                    exitEquipment: d.posId || d.id.toString(),
                    exitTime: { gte: todayStart }
                }
            })

            return {
                ...d,
                isOnline,
                entries,
                exits
            }
        }))

        return NextResponse.json(enrichedDevices)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
