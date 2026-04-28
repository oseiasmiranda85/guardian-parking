
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Listing ALL Tenant Users:")
    const users = await prisma.tenantUser.findMany({
        include: { tenant: true }
    })

    if (users.length === 0) {
        console.log("No users found.")
    } else {
        users.forEach(u => {
            console.log(`- [${u.id}] ${u.username} (${u.role}) - Tenant: ${u.tenant.name}`)
        })
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
