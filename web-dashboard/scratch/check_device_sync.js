
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const tickets = await prisma.ticket.findMany({
        take: 5,
        orderBy: { entryTime: 'desc' },
        select: {
            plate: true,
            entryTime: true,
            entryEquipment: true,
            exitEquipment: true
        }
    })

    const devices = await prisma.device.findMany({
        select: {
            posId: true,
            name: true
        }
    })

    console.log("--- LATEST TICKETS ---")
    console.table(tickets)
    
    console.log("--- REGISTERED DEVICES ---")
    console.table(devices)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
