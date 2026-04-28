
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const emails = ['admin@stone.com.br', 'op1@admin.com', 'op2@admin.com']

    for (const email of emails) {
        console.log(`\nChecking User: ${email}`)
        const user = await prisma.tenantUser.findFirst({
            where: { username: email },
            include: {
                tenant: {
                    include: { subscription: true }
                }
            }
        })

        if (!user) {
            console.log("  -> User NOT FOUND")
            continue
        }

        console.log(`  -> Role: ${user.role}`)
        console.log(`  -> Tenant: ${user.tenant.name} (ID: ${user.tenant.id})`)

        if (user.tenant.subscription) {
            console.log(`  -> Subscription Status: ${user.tenant.subscription.status}`)
            console.log(`  -> Subscription Type: ${user.tenant.subscription.type}`)
        } else {
            console.log("  -> NO SUBSCRIPTION FOUND")
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
