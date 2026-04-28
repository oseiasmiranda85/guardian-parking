
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const body = await request.json()
        const { manualPenalty, manualInterest, discount, paymentDate } = body

        const invoice = await prisma.invoice.findUnique({ where: { id } })
        if (!invoice) return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })

        // Calculate Final Amount
        // Base - Discount + Penalty + Interest
        const penalty = parseFloat(manualPenalty || '0')
        const interest = parseFloat(manualInterest || '0')
        const disc = parseFloat(discount || '0')

        const finalAmount = invoice.amount + penalty + interest - disc

        // Use provided date or now
        const paidAt = paymentDate ? new Date(paymentDate) : new Date()

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: paidAt,
                penalty,
                interest,
                finalAmount
            }
        })

        // Unblock Tenant (Optimistic)
        // If there are other overdue invoices, the next Cron will re-block them.
        await prisma.subscription.update({
            where: { tenantId: invoice.tenantId },
            data: { status: 'ACTIVE' }
        })

        return NextResponse.json(updated)

    } catch (error: any) {
        return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 })
    }
}
