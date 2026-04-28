const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { entryTime: 'desc' },
    take: 5
  })
  console.log('Last 5 tickets:', JSON.stringify(tickets, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
