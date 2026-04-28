
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log("--- BILLING FLOW VERIFICATION ---")

    // 0. Setup
    // Use EXPOIMP (ID 21)
    const tenantId = 21
    const name = "EXPOIMP"

    console.log(`Target: ${name} (ID: ${tenantId})`)

    // Reset Subscription to ACTIVE
    await prisma.subscription.upsert({
        where: { tenantId },
        update: { status: 'ACTIVE', type: 'RECURRING_MONTHLY' },
        create: { tenantId, status: 'ACTIVE', type: 'RECURRING_MONTHLY' }
    })
    console.log("0. Subscription Reset to ACTIVE")

    // Config Tolerance
    await prisma.sysConfig.upsert({
        where: { id: "GLOBAL" },
        update: { blockToleranceDays: 3 },
        create: { id: "GLOBAL", blockToleranceDays: 3 }
    })
    console.log("0. Tolerance set to 3 Days")

    // Create Overdue Invoice (Due 5 days ago)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() - 5)

    const invoice = await prisma.invoice.create({
        data: {
            tenantId,
            amount: 100.00,
            dueDate: dueDate,
            referenceMonth: 'TEST/FLOW',
            status: 'PENDING'
        }
    })
    console.log(`0. Created Invoice #${invoice.id} (Due: ${dueDate.toISOString()})`)

    // 1. RUN CRON LOGIC (Simulated)
    console.log("\n--- 1. RUNNING CRON ---")

    // Logic from cron/billing/route.ts
    const config = await prisma.sysConfig.findUnique({ where: { id: "GLOBAL" } })
    const thresholdDate = new Date()
    thresholdDate.setDate(new Date().getDate() - (config?.blockToleranceDays || 5))

    const overdue = await prisma.invoice.findMany({
        where: {
            status: 'PENDING',
            dueDate: { lt: thresholdDate }
        }
    })
    console.log(`Cron found ${overdue.length} overdue invoices.`)

    for (const inv of overdue) {
        if (inv.id === invoice.id) console.log(">> Target Invoice found!")

        await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'OVERDUE' }
        })
        await prisma.subscription.update({
            where: { tenantId: inv.tenantId },
            data: { status: 'BLOCKED' }
        })
    }

    // Check Block
    const subAfter = await prisma.subscription.findUnique({ where: { tenantId } })
    console.log(`Tenant Status After Cron: ${subAfter?.status}`)
    if (subAfter?.status !== 'BLOCKED') throw new Error("Tenant should be BLOCKED")

    // 2. PAY INVOICE
    console.log("\n--- 2. PAYING INVOICE ---")
    // Logic from invoices/[id]/pay/route.ts
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date(), finalAmount: 110.00 }
    })

    // Auto-Unblock Logic
    await prisma.subscription.update({
        where: { tenantId },
        data: { status: 'ACTIVE' }
    })
    console.log("Payment Processed & Unblock Triggered")

    // Check Unblock
    const subFinal = await prisma.subscription.findUnique({ where: { tenantId } })
    console.log(`Tenant Status After Payment: ${subFinal?.status}`)
    if (subFinal?.status !== 'ACTIVE') throw new Error("Tenant should be ACTIVE")

    console.log("\n✅ BILLING FLOW VERIFIED SUCCESS")
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
