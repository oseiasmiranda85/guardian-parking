
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log("--- MIGRATING PASSWORDS TO BCRYPT ---")

    // 1. SysAdmins
    const admins = await prisma.sysAdmin.findMany()
    console.log(`Found ${admins.length} admins.`)

    for (const admin of admins) {
        // Skip if already hashed (starts with $2)
        if (admin.password.startsWith('$2')) {
            console.log(`Skipping ${admin.email} (Already hashed)`)
            continue
        }

        const hash = bcrypt.hashSync(admin.password, 10)
        await prisma.sysAdmin.update({
            where: { id: admin.id },
            data: { password: hash }
        })
        console.log(`Hashed password for ${admin.email}`)
    }

    // 2. Tenant Users
    const users = await prisma.tenantUser.findMany()
    console.log(`Found ${users.length} tenant users.`)

    for (const user of users) {
        if (user.password.startsWith('$2')) {
            console.log(`Skipping ${user.username} (Already hashed)`)
            continue
        }

        const hash = bcrypt.hashSync(user.password, 10)
        await prisma.tenantUser.update({
            where: { id: user.id },
            data: { password: hash }
        })
        console.log(`Hashed password for ${user.username}`)
    }

    console.log("Migration Complete.")
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())
