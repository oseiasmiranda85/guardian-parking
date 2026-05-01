import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        // Authenticate (Mock Middleware)
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Extract TenantID from Token (Mock)
        // In real app, verify JWT. Here we assume token structure "mock-jwt-USERID-TIMESTAMP"
        // But we actually need the TenantID. 
        // Let's rely on a Header "X-Tenant-ID" for this prototype validation, 
        // to avoid complex JWT parsing code in this specific file.
        const tenantIdStr = request.headers.get('X-Tenant-ID')
        console.log(`[SYNC] Sync request for Tenant: ${tenantIdStr}`)
        
        if (!tenantIdStr) {
            console.warn('[SYNC] Tenant ID missing in headers')
            return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })
        }

        const tenantId = parseInt(tenantIdStr)
        const body = await request.json() // Array of ParkingEntries
        console.log(`[SYNC] Received ${Array.isArray(body) ? body.length : 1} tickets`)
        
        const tickets = Array.isArray(body) ? body : [body]

        let syncedCount = 0

        for (const t of tickets) {
            // Find existing ticket by localId (UUID)
            const existingTicket = await prisma.ticket.findUnique({
                where: { localId: t.uuid }
            })

            let ticketId: number;

            if (existingTicket) {
                // UPDATE
                const updated = await prisma.ticket.update({
                    where: { id: existingTicket.id },
                    data: {
                        exitTime: t.exitTime ? new Date(t.exitTime) : undefined,
                        status: t.status || (t.isPaid ? 'PAID' : (t.exitTime ? ((t.amount === 0 || t.amount === null) ? 'REFUNDED' : 'EXITED') : 'OPEN')),
                        amountPaid: t.amount || 0,
                        accreditedId: t.accreditedId,
                        vehicleType: t.type || undefined,
                        pricingTableId: t.pricingTableId ? parseInt(t.pricingTableId.toString()) : undefined,
                        ...(t.exitDeviceId && { exitEquipment: t.exitDeviceId }),
                        photoUrl: t.photoUrl || existingTicket.photoUrl,
                        localId: t.uuid
                    }
                })
                ticketId = updated.id
            } else {
                // AUTO-CLOSE any other active tickets for this plate before creating new one
                await prisma.ticket.updateMany({
                    where: {
                        tenantId: tenantId,
                        plate: t.plate,
                        status: { in: ['OPEN', 'PAID'] }
                    },
                    data: {
                        status: 'EXITED',
                        exitTime: new Date()
                    }
                })

                // CREATE
                const created = await prisma.ticket.create({
                    data: {
                        tenantId: tenantId,
                        plate: t.plate,
                        localId: t.uuid,
                        amountPaid: t.amount || 0,
                        status: t.status || (t.isPaid ? 'PAID' : (t.exitTime ? ((t.amount === 0 || t.amount === null) ? 'REFUNDED' : 'EXITED') : 'OPEN')),
                        entryTime: new Date(t.entryTime),
                        exitTime: t.exitTime ? new Date(t.exitTime) : undefined,
                        entryOperatorId: t.operatorId ? parseInt(t.operatorId.toString()) : undefined,
                        ticketType: t.category || 'ROTATIVO',
                        vehicleType: t.type || 'CAR',
                        pricingTableId: t.pricingTableId ? parseInt(t.pricingTableId.toString()) : undefined,
                        accreditedId: t.accreditedId,
                        entryEquipment: t.deviceId || 'POS',
                        exitEquipment: t.exitDeviceId || undefined,
                        photoUrl: t.photoUrl
                    }
                })
                ticketId = created.id
            }

            // Create or Void Transaction for Cash Flow
            const isCourtesy = t.paymentMethod === 'CORTESIA' || t.category === 'CORTESIA';
            const actualAmount = isCourtesy ? 0 : (t.amount || 0);

            if (t.status === 'CANCELLED' || t.status === 'REFUNDED') {
                // DELETE any transaction for this ticket if it was cancelled
                await prisma.transaction.deleteMany({
                    where: { ticketId: ticketId }
                })
            } else if (t.isPaid && actualAmount > 0) {
                // Check if transaction already exists for this ticket
                const existingTx = await prisma.transaction.findFirst({
                    where: { ticketId: ticketId, amount: actualAmount }
                })

                if (!existingTx) {
                    await prisma.transaction.create({
                        data: {
                            tenantId: tenantId,
                            ticketId: ticketId,
                            amount: actualAmount,
                            method: t.paymentMethod || 'CASH',
                            operatorId: t.operatorId ? parseInt(t.operatorId.toString()) : undefined,
                            createdAt: new Date()
                        }
                    })
                }
            } else if (isCourtesy || (!t.isPaid && t.exitTime && actualAmount === 0)) {
                // VOID transactions for this ticket (Courtesy/Refund/Tolerance case)
                await prisma.transaction.deleteMany({
                    where: { ticketId: ticketId }
                })
            }

            syncedCount++
        }

        return NextResponse.json({ success: true, count: syncedCount })

    } catch (error: any) {
        console.error('[SYNC_TICKETS_ERROR] Details:', error.message || error)
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const tenantIdStr = request.headers.get('X-Tenant-ID')
        if (!tenantIdStr) return NextResponse.json({ error: 'Tenant ID missing' }, { status: 400 })

        const tenantId = parseInt(tenantIdStr)

        // Get all active tickets (OPEN or PAID but not EXITED)
        const activeTickets = await prisma.ticket.findMany({
            where: {
                tenantId: tenantId,
                status: { in: ['OPEN', 'PAID'] }
            },
            include: { 
                pricingTable: true,
                transactions: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        // Map to Sync format for Android
        const formatted = activeTickets.map(t => ({
            id: t.id,
            uuid: t.localId,
            plate: t.plate,
            entryTime: t.entryTime.getTime(),
            exitTime: t.exitTime?.getTime(),
            isPaid: t.status === 'PAID',
            amount: t.amountPaid || 0,
            paymentMethod: t.transactions[0]?.method || null,
            operatorId: t.entryOperatorId?.toString(),
            category: t.ticketType, 
            type: t.vehicleType,
            billingMode: t.pricingTable?.billingMode || 'PREPAID',
            deviceId: t.entryEquipment, 
            photoUrl: t.photoUrl
        }))

        return NextResponse.json(formatted)
    } catch (error: any) {
        console.error('[SYNC-GET] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
