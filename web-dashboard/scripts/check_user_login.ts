
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@stone.com.br'
    console.log(`Checking Owner with email: ${email}`)

    try {
        const owner = await prisma.owner.findUnique({
            where: { email }
        })
        console.log('Owner found:', owner)

        console.log(`\nChecking TenantUser with username: ${email}`)
        const tenantUser = await prisma.tenantUser.findFirst({
            where: { username: email },
            include: { tenant: true }
        })
        console.log('TenantUser found:', tenantUser)

        // Also list all TenantUsers to see what we have
        const allUsers = await prisma.tenantUser.findMany()
        console.log('\nAll TenantUsers:', allUsers)

    } catch (e) {
        console.error('ERROR:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
