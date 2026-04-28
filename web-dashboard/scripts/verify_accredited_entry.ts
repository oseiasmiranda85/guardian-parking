
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Checking for recent tickets...")

    const recentTickets = await prisma.ticket.findMany({
        orderBy: { entryTime: 'desc' },
        take: 5,
        include: { tenant: true }
    })

    if (recentTickets.length === 0) {
        console.log("No tickets found in the database.")
    } else {
        console.log("Latest 5 Tickets:")
        recentTickets.forEach(t => {
            console.log(`- [${t.id}] Plate: ${t.plate || 'N/A'} | Type: ${t.ticketType} | Entry: ${t.entryTime} | Tenant: ${t.tenant.name}`)
        })
    }

    // Check specifically for Accredited
    const accredited = await prisma.ticket.findFirst({
        where: {
            OR: [
                { ticketType: 'CREDENCIADO' },
                { ticketType: 'ACCREDITED' }
            ]
        },
        orderBy: { entryTime: 'desc' }
    })

    if (accredited) {
        console.log("\nFound Accredited Ticket:")
        console.log(accredited)
    } else {
        console.log("\nNo specific 'CREDENCIADO' ticket found.")
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
