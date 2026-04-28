
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    console.log("Modelos disponíveis:", Object.keys(prisma).filter(k => !k.startsWith('_')))
    try {
        console.log("Tentando acessar accreditedCategory...")
        console.log("Tipo de accreditedCategory:", typeof prisma.accreditedCategory)
    } catch (e) {
        console.log("Erro ao acessar accreditedCategory:", e.message)
    } finally {
        await prisma.$disconnect()
    }
}

test()
