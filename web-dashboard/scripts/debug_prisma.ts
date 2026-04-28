
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging Prisma Client ---')

    // 1. Check if we can select billingMode
    // Note: We won't actually update, just check types/runtime
    try {
        const table = await prisma.pricingTable.findFirst({
            select: { id: true, billingMode: true }
        })
        console.log('Select Success:', table)
    } catch (e: any) {
        console.error('Select Failed:', e.message)
    }

    // 2. Try to update (mock)
    try {
        // We don't need a real ID, just want to see if validation passes before DB hit, 
        // or if it fails on "Same unknown arg".
        await prisma.pricingTable.update({
            where: { id: 0 }, // Unlikely to exist, but schema validation happens first
            data: {
                billingMode: 'POSTPAID'
            }
        })
    } catch (e: any) {
        if (e.message.includes('Record to update not found')) {
            console.log('Update Validation Passed (Record not found is expected)')
        } else {
            console.error('Update Failed:', e.message)
        }
    }

    console.log('--- End Debug ---')
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
