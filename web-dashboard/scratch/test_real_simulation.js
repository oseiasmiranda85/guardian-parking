const http = require('http');

const ROBOT_URL = 'http://192.168.1.12:3333/generate-ticket';

// RAW Base64
const DUMMY_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhcXl5iZmqjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/ooooA//2Q==";

function postTicket(payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(ROBOT_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) resolve();
            else reject(new Error(`Status: ${res.statusCode}`));
        });
        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function runSimulation() {
    console.log("🚀 Iniciando Simulação com Dados Reais (Protocolo rawContent)...\n");

    // 1. SIMULAÇÃO ENTRADA
    const entryRaw = `        GUARDIAN
     PARKING SYSTEM

================================
        GUARDIAN PARKING
================================

[ FOTO DO VEICULO ]
  FOTO REGISTRADA NA ENTRADA

EVENTO:  ESTACIONAMENTO
DATA:    25/04/2026, 16:27:00
VEICULO: CARRO
PLACA:   BRA2E19
VALOR:   R$ 0,00
PAGTO:   PENDENTE


      [ QR CODE ]
    VALIDACAO DE SAIDA
================================
TERM: PDV-01
`;

    console.log("Enviando TICKET DE ENTRADA...");
    await postTicket({
        rawContent: entryRaw,
        photo: DUMMY_BASE64,
        timestamp: "25/04/2026, 16:27:00"
    });
    console.log("✅ OK");

    await new Promise(r => setTimeout(r, 2000));

    // 2. SIMULAÇÃO INVENTÁRIO
    const invRaw = `        GUARDIAN
     PARKING SYSTEM

================================
      VEICULOS NO PATIO
================================
DATA: 25/04/2026, 16:28:00
TERM: PDV-01
--------------------------------
ABC1D23  | CARRO    | 14:30
BRA2E19  | CARRO    | 16:27
KJK8822  | MOTO     | 16:30
--------------------------------
TOTAL DE VEICULOS: 3
================================
`;

    console.log("Enviando RELATÓRIO DE INVENTÁRIO (Style: INVENTORY)...");
    await postTicket({
        style: "INVENTORY",
        rawContent: invRaw,
        terminal: "PDV-01",
        timestamp: "25/04/2026, 16:28:00"
    });
    console.log("✅ OK (Deve abrir automaticamente no Mac)");

    await new Promise(r => setTimeout(r, 2000));

    // 3. SIMULAÇÃO FECHAMENTO
    const zRaw = `        GUARDIAN
     PARKING SYSTEM

================================
       RELATORIO DE CAIXA
================================
DATA: 25/04/2026, 16:30:00
TERM: PDV-01
ID:   SESSION-17
OPER: ALEXANDRE
--------------------------------
RESUMO DE PAGAMENTOS:
DINHEIRO     12   300,00
CREDITO       8   800,00
PIX           4   480,00
--------------------------------
ESTORNOS/CANCELADOS:
TOTAIS        2    30,00
--------------------------------
TIPO VEICULO:
CARRO        22  1550,00
MOTO          2    30,00
--------------------------------
TOTAL GERAL:      R$  1580,00
================================

ASSINATURA GERENTE:

________________________________
`;

    console.log("Enviando FECHAMENTO DE CAIXA...");
    await postTicket({
        style: "ZREPORT",
        rawContent: zRaw,
        operator: "ALEXANDRE",
        total: 1580.00,
        timestamp: "25/04/2026, 16:30:00"
    });
    console.log("✅ OK");

    console.log("\n🏁 Simulação concluída! Verifique a tela do seu Mac.");
}

runSimulation();
