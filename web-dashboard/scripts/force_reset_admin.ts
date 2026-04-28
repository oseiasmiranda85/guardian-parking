
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log("--- FORCE RESET ADMINS ---")

    // 1. Delete ALL
    const deleted = await prisma.sysAdmin.deleteMany()
    console.log(`Deleted ${deleted.count} existing admins.`)

    // 2. Create Oseias
    const user = await prisma.sysAdmin.create({
        data: {
            email: 'oseias@live.it',
            name: 'Master Oseias',
            password: 'admin123'
        }
    })

    console.log(`Created Master: ${user.name} (${user.email}) - ID: ${user.id}`)
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
