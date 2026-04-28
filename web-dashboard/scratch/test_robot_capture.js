const http = require('http');

const ROBOT_URL = 'http://192.168.1.12:3333/generate-ticket';

const DUMMY_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1FVWV1hZWmNkZWZnaGlqc3R1dnd4eXqGhcXl5iZmqjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/ooooA//2Q==";

const samples = [
    {
        name: "Teste de Relatório Pré-Formatado (Texto + Foto)",
        payload: {
            // Campos de Dados
            eventName: "GUARDIAN PARKING",
            plate: "ABC1D23",
            type: "CARRO",
            photo: DUMMY_BASE64,
            
            // Campo de Relatório Montado (Caso o robô espere o comando pronto)
            report: `
================================
     GUARDIAN PARKING SYSTEM    
================================
        COMPROVANTE DE ENTRADA  

PLACA: ABC1D23
VEICULO: CARRO
ENTRADA: 25/04/2026 16:22:00
VALOR: R$ 0,00
STATUS: A PAGAR

================================
      TERM: PDV-01  v1.7.0      
================================
            `
        }
    }
];

function postTicket(data) {
    return new Promise((resolve, reject) => {
        const url = new URL(ROBOT_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`Status: ${res.statusCode}`));
            }
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log("🚀 Enviando Relatório Formatado...");
    for (const test of samples) {
        try {
            console.log(`\nEnviando: ${test.name}...`);
            await postTicket(test.payload);
            console.log(`✅ Enviado!`);
        } catch (error) {
            console.error(`❌ Falha: ${error.message}`);
        }
    }
    console.log("\n🏁 Verifique se o relatório saiu correto no Robô.");
}

runTests();
