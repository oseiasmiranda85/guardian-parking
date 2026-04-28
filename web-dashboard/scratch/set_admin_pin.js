
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const updated = await prisma.tenantUser.updateMany({
        where: { username: 'admin22@a.com' },
        data: { pin: '1234' }
    })

    console.log("PIN Updated:", updated)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
