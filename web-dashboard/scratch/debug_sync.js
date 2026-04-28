
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSync() {
    try {
        const tenantId = 22
        const t = {
            plate: 'YYYYYYY',
            entryTime: 1777052467317,
            isPaid: true,
            amount: 20.0,
            operatorId: "22",
            paymentMethod: 'CASH'
        }

        const entryDate = new Date(t.entryTime)
        console.log("Checking ticket for:", t.plate, entryDate)

        const existingTicket = await prisma.ticket.findFirst({
            where: {
                tenantId: tenantId,
                plate: t.plate,
                entryTime: {
                    gte: new Date(entryDate.getTime() - 1000),
                    lte: new Date(entryDate.getTime() + 1000)
                }
            }
        })

        console.log("Existing Ticket:", existingTicket ? "Found" : "Not Found")

        if (existingTicket) {
            console.log("Updating ticket...")
        } else {
            console.log("Creating ticket...")
            // The 500 might happen here if operatorId 22 doesn't exist in TenantUser
            const created = await prisma.ticket.create({
                data: {
                    tenantId: tenantId,
                    plate: t.plate,
                    amountPaid: t.amount || 0,
                    status: t.isPaid ? 'PAID' : 'OPEN',
                    entryTime: entryDate,
                    entryOperatorId: t.operatorId ? parseInt(t.operatorId.toString()) : undefined,
                }
            })
            console.log("Created ID:", created.id)
        }

    } catch (e) {
        console.error("SYNC TEST ERROR:", e)
    } finally {
        await prisma.$disconnect()
    }
}

testSync()
