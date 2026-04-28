
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("--- Configuring COND Parking ---")

    // 1. Find or Create Owner
    let owner = await prisma.owner.findUnique({ where: { document: '000.000.000-00' } })
    if (!owner) {
        owner = await prisma.owner.create({
            data: {
                name: 'Gestor Teste',
                document: '000.000.000-00',
                email: 'test@cond.com'
            }
        })
    }

    // 2. Find or Create Tenant (COND)
    let tenant = await prisma.tenant.findFirst({ where: { name: 'Estacionamento COND' } })
    if (!tenant) {
        console.log("Creating Tenant 'Estacionamento COND'...")
        tenant = await prisma.tenant.create({
            data: {
                name: 'Estacionamento COND',
                ownerId: owner.id,
                totalSpots: 100
            }
        })
    }
    console.log(`Using Tenant #${tenant.id}: ${tenant.name}`)

    // 3. Deactivate old tables
    await prisma.pricingTable.updateMany({
        where: { tenantId: tenant.id },
        data: { isActive: false }
    })

    // 4. Create CAR Table
    console.log("Creating CAR Table (Turnos)...")
    await prisma.pricingTable.create({
        data: {
            tenantId: tenant.id,
            name: 'Tabela Turnos (CAR)',
            vehicleType: 'CAR',
            type: 'FIXED_TIME',
            isActive: true, // ACTIVE
            slots: {
                create: [
                    { startTime: '16:00', endTime: '07:00', price: 30.00 }, // Night
                    { startTime: '07:01', endTime: '15:59', price: 20.00 }  // Day
                ]
            }
        }
    })

    // 5. Create MOTO Table
    console.log("Creating MOTO Table (Turnos)...")
    await prisma.pricingTable.create({
        data: {
            tenantId: tenant.id,
            name: 'Tabela Turnos (MOTO)',
            vehicleType: 'MOTO',
            type: 'FIXED_TIME',
            isActive: true, // ACTIVE
            slots: {
                create: [
                    { startTime: '16:00', endTime: '07:00', price: 15.00 }, // Night
                    { startTime: '07:01', endTime: '15:59', price: 10.00 }  // Day
                ]
            }
        }
    })

    console.log("SUCCESS: Configuration Applied.")
}

main()
