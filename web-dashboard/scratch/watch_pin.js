
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("Monitorando PIN para admin22@a.com...")
    let attempts = 0
    const originalPin = '1234'
    
    while (attempts < 60) { // Monitor for 2 minutes
        const user = await prisma.tenantUser.findFirst({
            where: { username: 'admin22@a.com' }
        })
        
        if (user && user.pin !== originalPin) {
            console.log("\n========================================")
            console.log("✅ PIN ALTERADO NO PORTAL DETECTADO!")
            console.log("USUÁRIO:", user.username)
            console.log("NOVO PIN NO BANCO:", user.pin)
            console.log("STATUS: PRONTO PARA USO NO POS")
            console.log("========================================\n")
            return
        }
        
        process.stdout.write(".")
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++
    }
    console.log("\nTempo limite atingido.")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
