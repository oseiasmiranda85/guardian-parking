
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.tenantUser.findMany({
        where: { tenantId: 22 }
    })

    console.log("\n✅ VERIFICAÇÃO DE PIN (TENANT 22)")
    console.log("========================================")
    users.forEach(u => {
        console.log(`USUÁRIO: ${u.username.padEnd(20)} | PIN: ${u.pin || '---'}`)
    })
    console.log("========================================\n")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
