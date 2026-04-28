import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
    try {
        const tenantIdStr = request.headers.get('X-Tenant-ID')
        console.log(`[SYNC-SESSIONS] Request for Tenant: ${tenantIdStr}`)
        
        const body = await request.json();
        const sessions = Array.isArray(body) ? body : (body.sessions || [body]);

        console.log(`[SYNC-SESSIONS] Received ${sessions.length} sessions`)

        if (!tenantIdStr || !sessions) {
            console.warn('[SYNC-SESSIONS] Missing tenantId or sessions')
            return NextResponse.json({ error: 'Missing tenantId or sessions' }, { status: 400 });
        }

        const tenantId = parseInt(tenantIdStr);
        let count = 0;

        for (const session of sessions) {
            try {
                await prisma.cashSession.upsert({
                    where: { id: session.id },
                    update: {
                        endTime: session.endTime ? new Date(session.endTime) : null,
                        closingBalance: session.closingBalance || 0,
                        totalRevenue: session.totalRevenue || 0,
                        status: session.status,
                        deviceId: session.deviceId || null
                    },
                    create: {
                        id: session.id,
                        tenantId: tenantId,
                        userId: typeof session.userId === 'string' ? parseInt(session.userId) : session.userId,
                        deviceId: session.deviceId || null,
                        startTime: new Date(session.startTime),
                        endTime: session.endTime ? new Date(session.endTime) : null,
                        startBalance: session.startBalance || 0,
                        closingBalance: session.closingBalance || 0,
                        totalRevenue: session.totalRevenue || 0,
                        status: session.status
                    }
                });
                count++;
            } catch (prismaError: any) {
                console.error(`[SYNC-SESSIONS] Prisma Error for session ${session.id}:`, prismaError.message);
                throw prismaError; // Re-throw to be caught by outer catch
            }
        }

        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        console.error('Error syncing sessions:', error.message || error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
