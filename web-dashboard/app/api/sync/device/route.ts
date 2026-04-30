import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const tenantIdStr = request.headers.get('X-Tenant-ID')
        if (!tenantIdStr) return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })

        const tid = parseInt(tenantIdStr)
        const body = await request.json()
        const { deviceId, operatorName, operatorId } = body

        console.log(`[SYNC_DEVICE] Heartbeat received from ${deviceId} for Tenant ${tid} (Operator: ${operatorName})`)

        if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })

        const now = new Date()

        // Robust device heartbeat logic
        let device = await prisma.device.findFirst({
            where: { posId: deviceId, tenantId: tid }
        })

        const deviceData = {
            status: 'ONLINE',
            lastSeen: now,
            lastPing: now,
            name: operatorName ? `POS ${operatorName}` : (device?.name || deviceId),
            type: 'ANDROID_POS',
        }

        if (device) {
            device = await prisma.device.update({
                where: { id: device.id },
                data: deviceData
            })
        } else {
            device = await prisma.device.create({
                data: {
                    ...deviceData,
                    tenantId: tid,
                    posId: deviceId,
                }
            })
        }

        return NextResponse.json({ 
            success: true,
            config: {
                requireExitTicket: device.requireExitTicket
            }
        })

    } catch (error: any) {
        console.error('[SYNC_ERROR] Details:', error.message || error)
        if (error.code) console.error('[SYNC_ERROR] Prisma Code:', error.code)
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
    }
}
