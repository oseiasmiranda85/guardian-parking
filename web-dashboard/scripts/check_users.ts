
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log("Checking SysAdmins...")
    const users = await prisma.sysAdmin.findMany()
    console.log("Found:", users.length)
    users.forEach(u => console.log(`${u.id}: ${u.name} (${u.email}) - Pass: ${u.password}`))
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
