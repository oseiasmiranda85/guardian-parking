import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId || tenantId.startsWith('ALL_')) {
            return NextResponse.json({ error: 'TenantId required' }, { status: 400 })
        }

        const tid = parseInt(tenantId)

        // A device is "online" if its lastSeen was within the last 10 minutes
        const onlineThreshold = new Date(Date.now() - 10 * 60 * 1000)

        const dbDevices = await prisma.device.findMany({
            where: { tenantId: tid },
            orderBy: { lastSeen: 'desc' }
        })

        // Use last 24 hours to avoid timezone issues with "start of day"
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const devices = await Promise.all(dbDevices.map(async d => {
            const deviceId = d.posId || `DEV-${d.id}`
            
            // Real-time counts for last 24h
            const entryCount = await prisma.ticket.count({
                where: {
                    tenantId: tid,
                    entryEquipment: deviceId,
                    entryTime: { gte: dayAgo }
                }
            })

            const exitCount = await prisma.ticket.count({
                where: {
                    tenantId: tid,
                    exitEquipment: deviceId,
                    exitTime: { gte: dayAgo }
                }
            })

            return {
                deviceId: deviceId,
                name: d.name,
                online: d.lastSeen ? d.lastSeen >= onlineThreshold : false,
                lastSeen: d.lastSeen?.toISOString() ?? d.lastPing?.toISOString() ?? new Date(0).toISOString(),
                status: d.status,
                requireExitTicket: d.requireExitTicket,
                autoRelease: d.autoRelease,
                autoPrintEntry: d.autoPrintEntry,
                toleranceMinutes: d.toleranceMinutes,
                requireEntryPhoto: d.requireEntryPhoto,
                requireExitPhoto: d.requireExitPhoto,
                entryCount: entryCount,
                exitCount: exitCount,
                totalOps: entryCount + exitCount
            }
        }))

        console.log(`[DASHBOARD_DEVICES] tid: ${tid}, rangeStart: ${dayAgo.toISOString()}, devicesCount: ${devices.length}`)
        if (devices.length > 0) {
            console.log(`[DASHBOARD_DEVICES] First device: ${devices[0].deviceId}, entries: ${devices[0].entryCount}, exits: ${devices[0].exitCount}`)
        }

        return NextResponse.json({ devices, total: devices.length })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
