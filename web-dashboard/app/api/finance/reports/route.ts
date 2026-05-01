import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyAuth, validateTenantAccess } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    console.log('>>> REPORTS API HIT <<<', request.url)
    try {
        // 1. Verify Auth
        const auth = await verifyAuth(request)
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { searchParams } = new URL(request.url)
        const requestedId = searchParams.get('tenantId')

        if (!requestedId || requestedId === 'undefined' || requestedId === 'null') {
            return NextResponse.json({ error: 'Tenant ID inválido' }, { status: 400 })
        }

        // 2. Security Check for Consolidated View
        if (requestedId.startsWith('ALL_') && auth.payload?.type !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso negado: Visão consolidada disponível apenas para Master.' }, { status: 403 })
        }

        let sessions: any[] = []

        if (requestedId.startsWith('ALL_')) {
            const ownerId = parseInt(requestedId.split('_')[1])
            // Consolidated view for Master
            if (isNaN(ownerId) || ownerId === 0) {
                sessions = await prisma.cashSession.findMany({
                    orderBy: { startTime: 'desc' },
                    include: { user: true, tenant: true }
                })
            } else {
                sessions = await prisma.cashSession.findMany({
                    where: { tenant: { ownerId: ownerId } },
                    orderBy: { startTime: 'desc' },
                    include: { user: true, tenant: true }
                })
            }
        } else {
            // 3. Validate Single Tenant Access
            const access = validateTenantAccess(auth.payload, requestedId)
            if (access.error) {
                return NextResponse.json({ error: access.error }, { status: access.status })
            }

            sessions = await prisma.cashSession.findMany({
                where: { tenantId: access.tenantId as number },
                orderBy: { startTime: 'desc' },
                include: { user: true, tenant: true }
            })
        }

        console.log(`[REPORTS-API] Found ${sessions.length} sessions`)

        const reports = await Promise.all(sessions.map(async (s, index) => {
            console.log(`[REPORTS-API] Processing session: ${s.id}`)
            const nextSession = sessions[index - 1]
            // Fetch Transactions during this session window
            // If the session has an explicit endTime, use it, BUT cap it at the next session's start time
            // to prevent overlapping revenue between sessions.
            let windowEnd = s.endTime || (nextSession ? nextSession.startTime : new Date())
            if (nextSession && nextSession.startTime < windowEnd) {
                windowEnd = nextSession.startTime;
            }
            
            const transactions = await prisma.transaction.findMany({
                where: {
                    tenantId: s.tenantId,
                    operatorId: s.userId,
                    createdAt: { 
                        gte: s.startTime, 
                        lt: windowEnd 
                    }
                },
                include: {
                    ticket: {
                        include: {
                            pricingTable: true
                        }
                    }
                }
            });

            // Payment Breakdown (Value and Count)
            const methods = ['CASH', 'CREDIT', 'DEBIT', 'PIX'];
            const paymentBreakdown: any = {};
            methods.forEach(m => {
                const filtered = transactions.filter(tx => tx.method === m || (m === 'CARD' && (tx.method === 'CREDIT' || tx.method === 'DEBIT')));
                paymentBreakdown[m.toLowerCase()] = {
                    total: filtered.reduce((sum, tx) => sum + (tx.amount || 0), 0),
                    count: filtered.length
                };
            });

            // Vehicle Type Breakdown
            const vehicleTypes: any = {};
            const typeMapping: any = {
                'CAR': 'CARRO',
                'MOTORCYCLE': 'MOTO',
                'MOTO': 'MOTO',
                'VAN': 'UTILITÁRIO',
                'TRUCK': 'CAMINHÃO',
                'Carro': 'CARRO',
                'Moto': 'MOTO',
                'OUTROS': 'OUTROS'
            };

            transactions.forEach(tx => {
                const rawType = tx.ticket?.vehicleType || tx.ticket?.pricingTable?.vehicleType || 'OUTROS';
                const type = typeMapping[rawType] || rawType.toUpperCase();
                if (!vehicleTypes[type]) {
                    vehicleTypes[type] = { count: 0, total: 0 };
                }
                vehicleTypes[type].count++;
                vehicleTypes[type].total += tx.amount || 0;
            });

            // Accredited Count (Entries or Exits by this operator in this window)
            const accreditedCount = await prisma.ticket.count({
                where: {
                    tenantId: s.tenantId,
                    OR: [
                        { entryOperatorId: s.userId, entryTime: { gte: s.startTime, lt: windowEnd } },
                        { exitOperatorId: s.userId, exitTime: { gte: s.startTime, lt: windowEnd } }
                    ],
                    ticketType: { in: ['CREDENCIADO', 'ACCREDITED'] }
                }
            });

            // Courtesy Count (Entries or Exits by this operator in this window)
            const courtesyCount = await prisma.ticket.count({
                where: {
                    tenantId: s.tenantId,
                    OR: [
                        { entryOperatorId: s.userId, entryTime: { gte: s.startTime, lt: windowEnd } },
                        { exitOperatorId: s.userId, exitTime: { gte: s.startTime, lt: windowEnd } }
                    ],
                    ticketType: 'CORTESIA'
                }
            });

            // Cancelled Tickets Summary
            const cancelledTickets = await prisma.ticket.findMany({
                where: {
                    tenantId: s.tenantId,
                    OR: [
                        { entryOperatorId: s.userId },
                        { exitOperatorId: s.userId }
                    ],
                    updatedAt: { gte: s.startTime, lt: windowEnd },
                    status: { in: ['CANCELLED', 'REFUNDED'] }
                }
            });

            const cancelledSummary = {
                count: cancelledTickets.length,
                total: cancelledTickets.reduce((sum, t) => sum + (t.amountDue || 0), 0)
            };

            return {
                id: s.id,
                date: new Date(new Date(s.startTime).getTime() - (3 * 60 * 60 * 1000)).toISOString().split('T')[0],
                terminal: s.deviceId || 'POS-VIRTUAL',
                operator: s.user?.name || 'Operador',
                openTime: new Date(new Date(s.startTime).getTime() - (3 * 60 * 60 * 1000)).toISOString().split('T')[1].substring(0, 5),
                closeTime: s.endTime ? new Date(new Date(s.endTime).getTime() - (3 * 60 * 60 * 1000)).toISOString().split('T')[1].substring(0, 5) : null,
                status: s.status,
                totalCash: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
                tenantName: s.tenant?.name || 'Estacionamento',
                tenantAddress: s.tenant?.address || '',
                paymentBreakdown,
                vehicleTypeBreakdown: Object.entries(vehicleTypes).map(([type, stats]: any) => ({
                    type,
                    count: stats.count,
                    total: stats.total
                })),
                cancelledSummary,
                vehicleCount: transactions.length,
                accreditedCount,
                courtesyCount
            };
        }));

        return NextResponse.json(reports)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
