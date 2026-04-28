import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepScan() {
    console.log("=== INICIANDO VARREDURA PROFUNDA NO BANCO DE DADOS ===");

    try {
        // 1. Contagem Geral de Registros
        const tenantsCount = await prisma.tenant.count();
        const ownersCount = await prisma.owner.count();
        const usersCount = await prisma.tenantUser.count();
        const adminsCount = await prisma.sysAdmin.count();
        const invoicesCount = await prisma.invoice.count();
        const ticketsCount = await prisma.ticket.count();
        const vehiclesCount = await prisma.vehicle.count();

        console.log(`\n[ESTATÍSTICAS GERAIS DA BASE]`);
        console.log(`Tenants (Estacionamentos): ${tenantsCount}`);
        console.log(`Owners (Proprietários): ${ownersCount}`);
        console.log(`SysAdmins (Desenvolvedores): ${adminsCount}`);
        console.log(`TenantUsers (Operadores/Gerentes): ${usersCount}`);
        console.log(`Invoices (Faturas SaaS): ${invoicesCount}`);
        console.log(`Tickets (Veículos Estacionados): ${ticketsCount}`);
        console.log(`Vehicles (Mensalistas/Clientes VIP): ${vehiclesCount}`);

        // 2. Procurando Padrões de Dados Fake (Seed Patterns)
        const fakePatterns = ['test.com', 'Admin Master', 'Estacionamento ', 'Owner ', 'Gerente ', 'ABC-'];
        
        console.log(`\n[ANALISANDO REGISTROS FAKE DA ÚLTIMA SEED]`);
        let fakeCount = 0;

        // Admins
        const fakeAdmins = await prisma.sysAdmin.findMany({
            where: { OR: [{ email: { contains: 'test.com' } }, { email: { contains: 'master.com' } }] }
        });
        if (fakeAdmins.length > 0) {
            console.log(`🚨 Encontrados ${fakeAdmins.length} Administradores falsos (Ex: ${fakeAdmins[0].email})`);
            fakeCount += fakeAdmins.length;
        }

        // Owners
        const fakeOwners = await prisma.owner.findMany({
            where: { email: { contains: 'test.com' } }
        });
        if (fakeOwners.length > 0) {
            console.log(`🚨 Encontrados ${fakeOwners.length} Proprietários falsos (Ex: ${fakeOwners[0].name})`);
            fakeCount += fakeOwners.length;
        }

        // Tenants
        const fakeTenants = await prisma.tenant.findMany({
            where: { name: { contains: 'Estacionamento ' } }
        });
        if (fakeTenants.length > 0) {
            console.log(`🚨 Encontrados ${fakeTenants.length} Estacionamentos falsos (Ex: ${fakeTenants[0].name})`);
            fakeCount += fakeTenants.length;
        }

        // Operadores
        const fakeUsers = await prisma.tenantUser.findMany({
            where: { username: { contains: 'test.com' } }
        });
        if (fakeUsers.length > 0) {
            console.log(`🚨 Encontrados ${fakeUsers.length} Operadores falsos (Ex: ${fakeUsers[0].username})`);
            fakeCount += fakeUsers.length;
        }

        // Faturas - As faturas falsas estão atreladas aos estacionamentos falsos
        const fakeInvoices = await prisma.invoice.count({
            where: { tenant: { name: { contains: 'Estacionamento ' } } }
        });
        if (fakeInvoices > 0) {
            console.log(`🚨 Encontradas ${fakeInvoices} Faturas falsas`);
            fakeCount += fakeInvoices;
        }

        console.log(`\n=== RESULTADO DA VARREDURA ===`);
        if (fakeCount > 0) {
            console.log(`❌ O banco POSSUI resquícios de dados falsos de simulação (Total de clusters fake encontrados: ~${fakeCount} anomalias detectadas).`);
            console.log(`\nSugestão: Para colocar em PRD oficial, rode "npx prisma db push --force-reset" sem preencher o script seed.`);
        } else if (tenantsCount === 0 && adminsCount === 0) {
            console.log(`⚪ O banco está TOTALMENTE VAZIO (Esgotado de tabelas preenchidas). Nenhuma sujeira detectada.`);
        } else {
            console.log(`✅ O banco NÃO indica padrões da nossa função "seed". Pode estar sujo por testes manuais, mas não pela fábrica automatizada.`);
        }

    } catch (e: any) {
        console.error("Erro na leitura do banco:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

deepScan();
