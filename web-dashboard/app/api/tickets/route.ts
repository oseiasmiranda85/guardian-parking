
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''

        if (!tenantId) return NextResponse.json([], { status: 400 })

        const tid = parseInt(tenantId)
        const skip = (page - 1) * limit

        const whereClause: any = { tenantId: tid }
        if (search) {
            // Check if search is ID
            if (!isNaN(parseInt(search))) {
                whereClause.OR = [
                    { plate: { contains: search.toUpperCase() } },
                    { id: parseInt(search) }
                ]
            } else {
                whereClause.plate = { contains: search.toUpperCase() }
            }
        }

        const statusParam = searchParams.get('status')
        if (statusParam && statusParam !== 'ALL') {
            if (statusParam === 'EXITED') {
                // Open or Paid but exited? Usually EXITED means status='PAID' or 'EXITED'
                // Our schema has 'OPEN', 'PAID', 'EXITED'.
                whereClause.status = 'EXITED'
            } else {
                whereClause.status = statusParam
            }
        }
        const stayParam = searchParams.get('stay')
        if (stayParam && stayParam !== 'ALL') {
            if (stayParam === 'IN_YARD') {
                whereClause.exitTime = null
            } else if (stayParam === 'EXITED') {
                whereClause.exitTime = { not: null }
            }
        }

        const [tickets, total] = await prisma.$transaction([
            prisma.ticket.findMany({
                where: whereClause,
                orderBy: { entryTime: 'desc' },
                skip,
                take: limit,
                include: {
                    transactions: { include: { operator: true } },
                    tenant: true
                }
            }),
            prisma.ticket.count({ where: whereClause })
        ])

        // Map to frontend expected format
        const mappedTickets = tickets.map(t => {
            // Find successful payment
            const paidTx = t.transactions.find(tx => tx.amount > 0)

            return {
                id: t.id,
                plate: t.plate || '---',
                entryTime: new Date(t.entryTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                exitTime: t.exitTime ? new Date(t.exitTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null,
                duration: t.exitTime ? 'Encerrado' : 'Pátio',
                status: t.status === 'OPEN' ? 'Active' : t.status === 'PAID' ? 'Paid' : t.status,
                photoUrl: t.photoUrl || '',
                entryEquipment: (t as any).entryEquipment || 'POS',
                exitEquipment: (t as any).exitEquipment || null,
                entryOperator: 'Sistema',
                payment: paidTx ? {
                    amount: paidTx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    method: paidTx.method,
                    status: 'Approved',
                    operatorName: paidTx.operator?.name || 'Sistema'
                } : { amount: '---', method: '---', status: 'Pending' }
            }
        })

        return NextResponse.json({
            data: mappedTickets,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
