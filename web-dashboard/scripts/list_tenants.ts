
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log("Listing Tenants...")
    const tenants = await prisma.tenant.findMany()
    tenants.forEach(t => console.log(`${t.id}: ${t.name}`))
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
