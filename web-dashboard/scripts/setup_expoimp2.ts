
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Setting up EXPOIMP2 ---')

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
    let tenant = await prisma.tenant.findFirst({ where: { name: 'EXPOIMP2' } })
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'EXPOIMP2',
                ownerId: owner.id,
                totalSpots: 5000,
                address: 'Centro de Convenções'
            }
        })
        console.log('Tenant EXPOIMP2 created.')
    } else {
        console.log('Tenant EXPOIMP2 already exists.')
    }

    // 3. Create Pricing Table (Fixed Price Logic)
    // "Prepaid" or "Postpaid"? Usually events are Prepaid (Fixed). 
    // Let's create a Fixed Price Table R$ 20.00
    const pricing = await prisma.pricingTable.create({
        data: {
            tenantId: tenant.id,
            name: 'Tabela Evento',
            type: 'FIXED_TIME', // Treating as flat fee per entry effectively or daily
            billingMode: 'PREPAID', // Charging at entry
            vehicleType: 'CAR',
            isActive: true,
            slots: {
                create: {
                    price: 20.0,
                    minMinutes: 0,
                    maxMinutes: 1440 // 24h
                }
            }
        }
    })
    console.log('Pricing table created.')

    // 4. Create 20 Operators
    const passwordHash = await hash('123456', 10)

    for (let i = 1; i <= 20; i++) {
        const username = `op${i}.expo` // short username
        const name = `Operador ${i}`

        const user = await prisma.tenantUser.create({
            data: {
                tenantId: tenant.id,
                name: name,
                username: username,
                password: passwordHash,
                role: 'OPERATOR'
            }
        })
        console.log(`User ${username} created.`)
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
