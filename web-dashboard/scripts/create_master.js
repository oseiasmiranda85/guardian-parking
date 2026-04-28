
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = 'oseias@live.it'
    const name = 'OSEIAS MIRANDA'
    const password = '8518' // Plain text as requested for dev (should be hashed in prod)

    console.log(`Creating Master Admin: ${name} (${email})...`)

    // Upsert to avoid duplicates
    const admin = await prisma.sysAdmin.upsert({
        where: { email },
        update: {
            name,
            password
        },
        create: {
            name,
            email,
            password
        }
    })

    console.log('✅ Admin created successfully:')
    console.log(admin)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
