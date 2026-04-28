
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const tid = 22
    const deviceId = 'POS-21B1A1F0'
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    console.log("Config:", { tid, deviceId, todayStart: todayStart.toISOString() })

    const entries = await prisma.ticket.count({
        where: {
            tenantId: tid,
            entryEquipment: deviceId,
            entryTime: { gte: todayStart }
        }
    })

    const exits = await prisma.ticket.count({
        where: {
            tenantId: tid,
            exitEquipment: deviceId,
            exitTime: { gte: todayStart }
        }
    })

    console.log("Results:", { entries, exits })
    
    // Check total tickets for this device ever
    const totalEver = await prisma.ticket.count({
        where: { entryEquipment: deviceId }
    })
    console.log("Total Ever for this device:", totalEver)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
