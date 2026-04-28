
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const MOCK_HASH = bcrypt.hashSync('123456', 10)


async function main() {
    console.log('🌱 Start seeding...')

    // 1. Clean Database
    try {
        await prisma.invoice.deleteMany()
        await prisma.pricingSlot.deleteMany()
        await prisma.pricingTable.deleteMany()
        await prisma.transaction.deleteMany()
        await prisma.ticket.deleteMany()
        await prisma.vehicle.deleteMany()
        await prisma.device.deleteMany()
        await prisma.tenantUser.deleteMany()
        await prisma.subscription.deleteMany()
        await prisma.tenant.deleteMany()
        await prisma.owner.deleteMany()
        await prisma.sysAdmin.deleteMany()
        console.log('🧹 Database cleaned.')
    } catch (e: any) {
        console.log("Error cleaning DB:", e.message)
    }

    // 2. Create Admin
    await prisma.sysAdmin.create({
        data: {
            name: 'Admin Master',
            email: 'admin@master.com',
            password: MOCK_HASH,
        }
    })

    // 3. Create 10 Owners
    const owners = []
    for (let i = 1; i <= 10; i++) {
        const owner = await prisma.owner.create({
            data: {
                name: `Owner ${i} Enterprise`,
                document: `000.000.00${i}-00`,
                email: `owner${i}@test.com`,
            }
        })
        owners.push(owner)
    }

    // 4. Create 20 Tenants (Parking Lots)
    const tenants = []
    for (let i = 1; i <= 20; i++) {
        const randomOwner = owners[Math.floor(Math.random() * owners.length)]

        // Random start date between Jan 1, 2025 and Today
        const startYear = 2025
        const startMonth = Math.floor(Math.random() * 12) // 0-11
        const createdAt = new Date(startYear, startMonth, 1)

        // Determine Adherence (70% Good Payer vs 30% Bad Payer)
        const isGoodPayer = Math.random() < 0.7
        const status = isGoodPayer ? 'ACTIVE' : (Math.random() > 0.5 ? 'BLOCKED' : 'PENDING')

        const tenant = await prisma.tenant.create({
            data: {
                name: `Estacionamento ${i} (Owner ${randomOwner.id})`,
                ownerId: randomOwner.id,
                createdAt: createdAt,
                subscription: {
                    create: {
                        type: 'RECURRING_MONTHLY',
                        status: status,
                        validUntil: new Date(2026, 7, 1) // Valid until Aug 2026
                    }
                }
            }
        })
        tenants.push({ ...tenant, isGoodPayer, createdAt })

        // Create TenantUser (Manager) so Android App can login
        await prisma.tenantUser.create({
            data: {
                tenantId: tenant.id,
                name: `Gerente ${i}`,
                username: `admin${i}@test.com`,
                password: MOCK_HASH,
                role: 'MANAGER'
            }
        })
    }

    // 5. Generate Invoices
    const targetEndDate = new Date(2026, 6, 1) // July 1st, 2026
    const today = new Date()

    for (const t of tenants) {
        let currentDate = new Date(t.createdAt)
        currentDate.setMonth(currentDate.getMonth() + 1) // First invoice 1 month after creation

        while (currentDate <= targetEndDate) {
            const refMonth = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`
            const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10) // Due 10th
            const amount = 200 + Math.floor(Math.random() * 800)

            let status = 'PENDING'
            let paidAt = null
            let penalty = 0
            let interest = 0
            let finalAmount = null

            // Logic
            if (dueDate < today) {
                // Past Invoice
                if (t.isGoodPayer) {
                    status = 'PAID'
                    paidAt = new Date(dueDate)
                    if (Math.random() > 0.95) paidAt.setDate(paidAt.getDate() + 5)
                    finalAmount = amount
                } else {
                    if (Math.random() > 0.5) {
                        status = 'PAID'
                        paidAt = new Date(dueDate)
                        paidAt.setDate(paidAt.getDate() + 20)
                        penalty = amount * 0.02
                        interest = amount * 0.01
                        finalAmount = amount + penalty + interest
                    } else {
                        status = 'OVERDUE'
                    }
                }
            } else {
                status = 'PENDING'
            }


            await prisma.invoice.create({
                data: {
                    tenantId: t.id,
                    referenceMonth: refMonth,
                    amount: amount,
                    dueDate: dueDate,
                    status: status,
                    paidAt: paidAt,
                    penalty: penalty,
                    interest: interest,
                    finalAmount: finalAmount
                }
            })

            currentDate.setMonth(currentDate.getMonth() + 1)
        }

        // 6. Generate Dummy Vehicles and Transactions for this Tenant
        const vehicleCount = 10 + Math.floor(Math.random() * 20)
        for (let v = 0; v < vehicleCount; v++) {
            const plate = `ABC-${Math.floor(1000 + Math.random() * 9000)}`
            await prisma.vehicle.create({
                data: {
                    tenantId: t.id,
                    plate: plate,
                    type: Math.random() > 0.8 ? 'VIP' : 'REGULAR_MONTHLY',
                    model: 'Carro Exemplo',
                    color: 'Prata'
                }
            })
        }

        const transactionCount = 15 + Math.floor(Math.random() * 30)
        for (let tr = 0; tr < transactionCount; tr++) {
            await prisma.transaction.create({
                data: {
                    tenantId: t.id,
                    amount: 15.00 + Math.floor(Math.random() * 50),
                    method: Math.random() > 0.5 ? 'CREDIT' : 'CASH',
                }
            })
        }

    }

    await prisma.$disconnect()
    console.log('✅ Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
