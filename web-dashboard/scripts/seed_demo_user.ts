
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const username = 'admin@stone.com.br'
    console.log(`Ensuring User exists: ${username}`)

    // 1. Find a valid Tenant
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
        console.error("No Tenant found! Cannot create user.")
        return
    }
    console.log(`Using Tenant: ${tenant.name} (ID: ${tenant.id})`)

    // 2. Check if user exists
    const existing = await prisma.tenantUser.findFirst({ where: { username } })

    if (existing) {
        console.log("User already exists. Updating password to '1234'...")
        await prisma.tenantUser.update({
            where: { id: existing.id },
            data: { password: '1234', role: 'MANAGER' }
        })
        console.log("User updated.")
    } else {
        console.log("Creating new user...")
        await prisma.tenantUser.create({
            data: {
                name: "Admin Stone Demo",
                username: username,
                password: "1234",
                role: 'MANAGER',
                tenantId: tenant.id
            }
        })
        console.log("User created.")
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
