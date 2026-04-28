
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('📋 Listing Master Admins...')

    const admins = await prisma.sysAdmin.findMany()

    if (admins.length === 0) {
        console.log('No admins found.')
    } else {
        console.table(admins.map(a => ({
            ID: a.id,
            Name: a.name,
            Email: a.email,
            Created: a.createdAt
        })))
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
