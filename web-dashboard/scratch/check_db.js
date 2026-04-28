const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('Tables found:', tables);
    
    const adminCount = await prisma.sysAdmin.count();
    console.log('SysAdmin count:', adminCount);
  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
