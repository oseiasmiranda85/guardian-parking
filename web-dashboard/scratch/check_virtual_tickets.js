const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTickets() {
  console.log('🔍 Verificando banco de dados por tickets virtuais...')
  const tickets = await prisma.virtualTicket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  if (tickets.length === 0) {
    console.log('❌ Nenhum ticket encontrado no banco.')
  } else {
    console.log(`✅ Encontrados ${tickets.length} tickets!`)
    tickets.forEach(t => {
      console.log(`- ID: ${t.id} | Criado em: ${t.createdAt} | Terminal: ${t.deviceId}`)
    })
  }
  process.exit(0)
}

checkTickets()
