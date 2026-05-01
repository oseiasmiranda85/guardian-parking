import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const tenantIdStr = request.headers.get('X-Tenant-ID')
        if (!tenantIdStr) return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })

        const tid = parseInt(tenantIdStr)
        const body = await request.json()
        
        // Body can be a single object or an array of telemetry events
        const events = Array.isArray(body) ? body : [body]

        for (const event of events) {
            await prisma.performanceTelemetry.create({
                data: {
                    tenantId: tid,
                    deviceId: event.deviceId,
                    eventType: event.eventType,
                    ocrTimeMs: event.ocrTimeMs,
                    captureTimeMs: event.captureTimeMs,
                    totalProcessTimeMs: event.totalProcessTimeMs,
                    apiLatencyMs: event.apiLatencyMs,
                    timestamp: event.timestamp ? new Date(event.timestamp) : new Date()
                }
            })
        }

        return NextResponse.json({ success: true, count: events.length })
    } catch (error: any) {
        console.error('[TELEMETRY_SYNC_ERROR]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
