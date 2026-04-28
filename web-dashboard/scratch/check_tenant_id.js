
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const tickets = await prisma.ticket.findMany({
        take: 5,
        orderBy: { entryTime: 'desc' },
        select: {
            id: true,
            tenantId: true,
            entryEquipment: true
        }
    })

    console.log("--- TICKET TENANT CHECK ---")
    console.table(tickets)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
