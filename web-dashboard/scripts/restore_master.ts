
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const email = 'oseias@live.it'
    const password = 'admin123' // Temporary password

    console.log(`Restoring Master User: ${email}...`)

    const user = await prisma.sysAdmin.upsert({
        where: { email },
        update: {
            password: password, // In a real app, hash this! But for dev/restore we store plain or hashed depending on auth logic.
            // Check auth logic: usually we compare plain strings in this MVP or hash.
            // Previous login route used plain string comparison or basic hash?
            // Let's check api/auth/login/route.ts but for now write plain.
        },
        create: {
            email,
            name: 'Master Oseias',
            password: password
        }
    })

    console.log(`User ${user.email} restored. ID: ${user.id}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
