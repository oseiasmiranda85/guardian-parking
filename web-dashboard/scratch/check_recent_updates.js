
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.tenantUser.findMany({
        orderBy: { id: 'desc' },
        take: 10
    })

    console.log("\nÚLTIMAS ALTERAÇÕES NO BANCO DE DADOS:")
    users.forEach(u => {
        console.log(`- ${u.username.padEnd(25)} | PIN: ${u.pin || '---'} | Atualizado em: ${u.updatedAt}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
