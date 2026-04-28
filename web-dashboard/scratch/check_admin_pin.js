
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.tenantUser.findFirst({
        where: { username: 'admin22@a.com' }
    })

    if (user) {
        console.log("User Found:", {
            email: user.email,
            pin: user.pin,
            tenantId: user.tenantId,
            role: user.role
        })
    } else {
        console.log("User admin22@a.com NOT FOUND")
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
