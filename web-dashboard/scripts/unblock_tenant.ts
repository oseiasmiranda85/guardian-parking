
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Unblocking Tenant 1 (admin@stone.com.br)...")

    await prisma.subscription.update({
        where: { tenantId: 1 },
        data: {
            status: 'ACTIVE',
            validUntil: new Date('2030-01-01')
        }
    })

    console.log("Tenant 1 Subscription set to ACTIVE.")
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
