import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: Request) {
    // Cron jobs often use GET. Use POST if strictly secured, but GET checks are fine for internal.
    // Auth Check: usually check a "Authorization: Bearer CRON_SECRET" header.
    // For MVP, we skip auth or check generic secret.

    try {
        let config = await prisma.sysConfig.findUnique({ where: { id: "GLOBAL" } })
        if (!config) config = await prisma.sysConfig.create({ data: { id: "GLOBAL" } })

        const toleranceDays = config.blockToleranceDays
        const now = new Date()

        // 1. Find PENDING invoices where dueDate + tolerance < now
        // dueDate < now - tolerance
        const thresholdDate = new Date()
        thresholdDate.setDate(now.getDate() - toleranceDays)

        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: 'PENDING',
                dueDate: {
                    lt: thresholdDate
                }
            },
            include: { tenant: true }
        })

        const blockedTenants = []

        // 2. Process Block
        for (const invoice of overdueInvoices) {
            // Mark Invoice as Overdue (Visual)
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: 'OVERDUE' }
            })

            // Block Tenant
            await prisma.subscription.update({
                where: { tenantId: invoice.tenantId },
                data: { status: 'BLOCKED' }
            })

            blockedTenants.push(invoice.tenant.name)
        }

        return NextResponse.json({
            success: true,
            processed: overdueInvoices.length,
            blocked: blockedTenants
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
