
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Setting up EXPOIMP3 ---')

    // 1. Create or Get Owner
    let owner = await prisma.owner.findFirst({ where: { email: 'admin@expoimp.com' } })
    if (!owner) {
        owner = await prisma.owner.create({
            data: {
                name: 'Expo Eventos Ltda',
                email: 'admin@expoimp.com',
                document: '99888777000199'
            }
        })
    }

    // 2. Create Tenant
    let tenant = await prisma.tenant.findFirst({ where: { name: 'EXPOIMP3' } })
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'EXPOIMP3',
                ownerId: owner.id,
                totalSpots: 6000,
                address: 'Pavilhão Novo - Setor 3'
            }
        })
        console.log('Tenant EXPOIMP3 created.')
    }

    // 3. Pricing Table
    const existingTable = await prisma.pricingTable.findFirst({ where: { tenantId: tenant.id } })
    if (!existingTable) {
        await prisma.pricingTable.create({
            data: {
                tenantId: tenant.id,
                name: 'Tabela EXPO 3',
                type: 'FIXED_TIME',
                billingMode: 'PREPAID',
                vehicleType: 'CAR',
                isActive: true,
                slots: {
                    create: {
                        price: 25.0,
                        minMinutes: 0,
                        maxMinutes: 1440
                    }
                }
            }
        })
    }

    // 4. Create 20 Operators (Unique usernames)
    // We already installed bcryptjs, so hash will work
    const passwordHash = await hash('123456', 10)

    for (let i = 1; i <= 20; i++) {
        const username = `op${i}.exp3`
        const name = `Operador ${i} (EXPO3)`

        const exists = await prisma.tenantUser.findFirst({
            where: { username }
        })

        if (!exists) {
            await prisma.tenantUser.create({
                data: {
                    tenantId: tenant.id,
                    name: name,
                    username: username,
                    password: passwordHash,
                    role: 'OPERATOR'
                }
            })
            console.log(`User ${username} created.`)
        } else {
            console.log(`User ${username} exists/skipped.`)
        }
    }
    console.log('--- Setup Complete ---')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
