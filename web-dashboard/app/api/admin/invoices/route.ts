import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')
        const ownerId = searchParams.get('ownerId')
        const monthParam = searchParams.get('month')
        const statusParam = searchParams.get('status')

        let whereClause: any = {}
        if (tenantId) whereClause.tenantId = parseInt(tenantId)
        if (ownerId) whereClause.tenant = { ownerId: parseInt(ownerId) }
        if (monthParam && monthParam !== 'ALL') whereClause.referenceMonth = monthParam
        if (statusParam && statusParam !== 'ALL') whereClause.status = statusParam

        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: { tenant: true },
            orderBy: { dueDate: 'desc' }
        })

        return NextResponse.json(invoices)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tenantId, amount, dueDate, referenceMonth } = body

        if (!tenantId || !amount || !dueDate) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const invoice = await prisma.invoice.create({
            data: {
                tenantId: parseInt(tenantId),
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                referenceMonth: referenceMonth || new Date().toISOString().slice(0, 7),
                status: 'PENDING'
            }
        })

        return NextResponse.json(invoice)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
