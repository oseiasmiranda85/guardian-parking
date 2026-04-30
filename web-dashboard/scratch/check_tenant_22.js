const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: 22 }
  })
  console.log(JSON.stringify(tenant, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
