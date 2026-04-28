
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const operators = [
        { name: 'Operador 1', email: 'op1@admin.com', role: 'OPERATOR' },
        { name: 'Operador 2', email: 'op2@admin.com', role: 'OPERATOR' }
    ]

    // Find the tenant used by admin@stone.com.br
    const admin = await prisma.tenantUser.findFirst({
        where: { username: 'admin@stone.com.br' },
        include: { tenant: true }
    })

    if (!admin) {
        console.error("Admin user not found. Cannot link operators.")
        return
    }

    const tenantId = admin.tenantId
    console.log(`Adding operators to Tenant: ${admin.tenant.name} (ID: ${tenantId})`)

    for (const op of operators) {
        const existing = await prisma.tenantUser.findFirst({ where: { username: op.email } })
        if (existing) {
            console.log(`User ${op.email} already exists.`)
        } else {
            await prisma.tenantUser.create({
                data: {
                    name: op.name,
                    username: op.email,
                    password: '1234', // Default password
                    role: op.role,
                    tenantId: tenantId
                }
            })
            console.log(`User ${op.email} created.`)
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
