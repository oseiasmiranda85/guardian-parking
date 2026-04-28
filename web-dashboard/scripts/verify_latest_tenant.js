const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Auditing Latest Tenant...')

    const tenant = await prisma.tenant.findFirst({
        orderBy: { id: 'desc' },
        include: {
            users: true,
            pricingTables: { include: { slots: true } },
            vehicles: true,
            tickets: true,
            transactions: true
        }
    })

    if (!tenant) {
        console.log('❌ No tenants found.')
        return
    }

    console.log(`\n📋 Tenant ID: ${tenant.id} | Name: ${tenant.name}`)
    console.log(`📅 Created At: ${tenant.createdAt}`)

    console.log('\n--- check: Users ---')
    console.log(`Count: ${tenant.users.length}`)
    tenant.users.forEach(u => console.log(`   - User: ${u.username} (${u.role})`))

    console.log('\n--- check: Pricing ---')
    console.log(`Tables: ${tenant.pricingTables.length}`)
    tenant.pricingTables.forEach(t => {
        console.log(`   - Table: ${t.name} (${t.slots.length} slots)`)
        t.slots.forEach(s => console.log(`     > ${s.minMinutes}-${s.maxMinutes}min: R$ ${s.price}`))
    })

    console.log('\n--- check: Junk Data (Should be 0) ---')
    console.log(`Vehicles: ${tenant.vehicles.length}`)
    console.log(`Tickets: ${tenant.tickets.length}`)
    console.log(`Transactions: ${tenant.transactions.length}`)

    const isClean = tenant.vehicles.length === 0 && tenant.tickets.length === 0 && tenant.transactions.length === 0
    const hasUser = tenant.users.length === 1
    const hasPricing = tenant.pricingTables.length >= 1

    console.log('\n--- 🏁 VERDICT ---')
    if (isClean && hasUser && hasPricing) {
        console.log('✅ PASSED: Tenant is Clean and Configured correctly.')
    } else {
        console.log('⚠️  FAILED: Anomalies detected.')
        if (!isClean) console.log('   -> Contains Junk Data.')
        if (!hasUser) console.log('   -> Missing or too many users.')
        if (!hasPricing) console.log('   -> Missing Pricing Table.')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
