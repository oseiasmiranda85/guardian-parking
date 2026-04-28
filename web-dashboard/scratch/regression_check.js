const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCheck() {
    console.log('=== REGRESSION CHECK ===');
    
    // 1. Tenant 22 Check
    const tid = 22;
    const transactions = await prisma.transaction.findMany({ where: { tenantId: tid } });
    const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    console.log(`[TENANT 22] Total Transactions: ${transactions.length}`);
    console.log(`[TENANT 22] Total Revenue (All Time): R$ ${totalAmount.toFixed(2)}`);

    // 2. Sessions Check
    const sessions = await prisma.cashSession.findMany({ where: { tenantId: tid } });
    const openSessions = sessions.filter(s => s.status === 'OPEN');
    console.log(`[SESSIONS] Total Sessions: ${sessions.length}`);
    console.log(`[SESSIONS] Open Sessions: ${openSessions.length}`);

    // 3. Today Revenue (Brazil Timezone Approximation)
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayTransactions = await prisma.transaction.findMany({
        where: {
            tenantId: tid,
            createdAt: { gte: todayStart }
        }
    });
    const todayAmount = todayTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    console.log(`[TODAY] Revenue since local midnight: R$ ${todayAmount.toFixed(2)}`);

    console.log('========================');
    await prisma.$disconnect();
}

runCheck().catch(err => {
    console.error(err);
    process.exit(1);
});
