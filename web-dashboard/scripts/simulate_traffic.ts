
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tenantId = 21 // Estacionamento Matriz Alpha
    const count = 300

    console.log(`🚀 Iniciando simulação de ${count} entradas para o Tenant ${tenantId}...`)

    const statuses = ['OPEN', 'PAID', 'EXITED']
    const vehicleTypes = [
        ...Array(60).fill('CARRO'),
        ...Array(30).fill('MOTO'),
        ...Array(10).fill('CREDENCIADO')
    ]

    const startDate = new Date('2026-04-18T08:00:00Z')
    const endDate = new Date('2026-04-21T23:00:00Z')

    for (let i = 0; i < count; i++) {
        // Random date within range
        const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
        const entryTime = new Date(randomTime)
        
        // Random vehicle type based on 60/30/10 ratio
        const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
        
        // Random plate
        const plate = Math.random().toString(36).substring(2, 5).toUpperCase() + 
                      Math.floor(Math.random() * 10) + 
                      Math.random().toString(36).substring(2, 3).toUpperCase() + 
                      Math.floor(Math.random() * 99).toString().padStart(2, '0')

        // Ticket Logic
        const isAccredited = type === 'CREDENCIADO'
        
        // Fixed exit time (2-5 hours later)
        const exitTime = new Date(entryTime.getTime() + (Math.random() * 3 * 3600000) + 3600000)
        
        // Status logic: if date is before today (Apr 22), it's probably PAID or EXITED.
        const status = entryTime.getTime() < new Date('2026-04-22').getTime() ? 'EXITED' : 'OPEN'

        await prisma.ticket.create({
            data: {
                tenantId,
                plate,
                entryTime,
                exitTime: status === 'EXITED' ? exitTime : null,
                status,
                ticketType: isAccredited ? 'ACCREDITED' : 'ROTATIVO',
                accreditedId: isAccredited ? `AUTH_${Math.floor(Math.random() * 1000)}` : null,
                amountPaid: status === 'EXITED' ? (type === 'MOTO' ? 10 : 25) : 0,
                amountDue: 0
            }
        })

        // Also create a vehicle record for persistence
        if (Math.random() > 0.5) {
            await prisma.vehicle.create({
                data: {
                    tenantId,
                    plate,
                    type: type === 'CREDENCIADO' ? 'CARRO' : type,
                    model: 'Simulado',
                    color: 'Preto'
                }
            })
        }

        // If paid, create a transaction
        if (status === 'EXITED') {
            await prisma.transaction.create({
                data: {
                    tenantId,
                    amount: type === 'MOTO' ? 10 : 25,
                    method: ['PIX', 'CASH', 'CREDIT', 'DEBIT'][Math.floor(Math.random() * 4)],
                    createdAt: exitTime
                }
            })
        }

        if (i % 50 === 0) console.log(`✅ ${i} registros processados...`)
    }

    console.log('✨ Simulação concluída com sucesso!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
