
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log("--- Simulating Event Traffic ---")

    // 1. Find Tenant
    const tenant = await prisma.tenant.findFirst({ where: { name: 'EXPOIMP' } })
    if (!tenant) throw new Error("Tenant EXPOIMP not found")

    console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})`)

    // 2. Create 50 Tickets
    const plates = []
    for (let i = 0; i < 50; i++) {
        plates.push({
            tenantId: tenant.id,
            plate: `ABC${1000 + i}`,
            entryTime: new Date(),
            status: 'OPEN'
        })
    }

    const result = await prisma.ticket.createMany({ data: plates })
    console.log(`Created ${result.count} tickets. All OPEN.`)
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
