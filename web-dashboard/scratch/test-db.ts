import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    try {
        const admin = await prisma.sysAdmin.findUnique({ where: { email: 'admin@master.com' } })
        console.log("Admin found:", admin)
    } catch(e) {
        console.error("DB error:", e)
    }
}
test()
