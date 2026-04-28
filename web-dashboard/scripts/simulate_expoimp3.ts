
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Config
const TENANT_NAME = 'EXPOIMP3'
const TOTAL_CARS = 4500
const EXIT_PERCENTAGE = 0.8 // 80%
const START_DATE = new Date('2026-01-23T08:00:00')
const END_DATE = new Date('2026-01-25T20:00:00')

// Helpers
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
const randomTime = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const PLATES_PREFIX = ['ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', 'YZW']
const genPlate = () => `${randomItem(PLATES_PREFIX)}${randomInt(1000, 9999)}`

async function main() {
    console.log(`--- Starting Simulation for ${TENANT_NAME} ---`)

    // 1. Get Tenant & Operators
    const tenant = await prisma.tenant.findFirst({
        where: { name: TENANT_NAME },
        include: { users: true, pricingTables: { include: { slots: true } } }
    })

    if (!tenant) throw new Error('Tenant not found. Run setup first.')

    // Filter only OPERATOR roles if mixed, but we want all 20 we just created
    const operators = tenant.users.filter(u => u.username.includes('.exp3'))

    const pricingTable = tenant.pricingTables[0]
    if (!pricingTable) throw new Error('No pricing table found.')

    console.log(`Tenant ID: ${tenant.id}`)
    console.log(`Operators Found: ${operators.length}`)

    if (operators.length < 20) console.warn('WARNING: Found fewer than 20 operators!')

    console.log('Generating traffic...')

    // Cleanup previous run to ensure clean state
    console.log('Clearing previous data for EXPOIMP3...')
    await prisma.transaction.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.ticket.deleteMany({ where: { tenantId: tenant.id } })

    for (let i = 0; i < TOTAL_CARS; i++) {
        const plate = genPlate()
        const operator = randomItem(operators)
        const entryTime = randomTime(START_DATE, END_DATE)

        const shouldExit = Math.random() < EXIT_PERCENTAGE
        const price = pricingTable.slots[0]?.price || 25.0

        // Create Ticket
        const ticket = await prisma.ticket.create({
            data: {
                tenantId: tenant.id,
                plate: plate,
                entryTime: entryTime,
                entryOperatorId: operator.id,
                status: 'OPEN',
                pricingTableId: pricingTable.id,
                ticketType: 'EVENT',
                amountDue: price,
            }
        })

        // PREPAID Logic: Pay Immediately
        const method = randomItem(['CASH', 'CREDIT', 'DEBIT', 'PIX'])

        await prisma.transaction.create({
            data: {
                tenantId: tenant.id,
                ticketId: ticket.id,
                amount: price,
                method: method,
                operatorId: operator.id, // Linked to the operator
                createdAt: entryTime
            }
        })

        await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: 'PAID',
                amountPaid: price
            }
        })

        // Exit Logic
        if (shouldExit) {
            const durationMs = randomInt(2 * 60 * 60 * 1000, 6 * 60 * 60 * 1000)
            let et = new Date(entryTime.getTime() + durationMs)

            // Randomly pick an EXIT operator (can be different)
            const exitOp = randomItem(operators)

            await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: 'EXITED',
                    exitTime: et,
                    exitOperatorId: exitOp.id
                }
            })
        }

        if (i % 500 === 0 && i > 0) console.log(`Processed ${i} vehicles...`)
    }

    console.log('--- Simulation Complete ---')
    console.log(`Total: ${TOTAL_CARS}`)
    console.log(`Exited: ~${TOTAL_CARS * EXIT_PERCENTAGE}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
