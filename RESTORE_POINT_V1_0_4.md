# Ponto de Restauração V1.0.4 - Câmera Always-On e Mira Verde

**Data:** 25/04/2026
**Commit Base:** Interface de Entrada Otimizada

## Funcionalidades Implementadas
1. **Câmera Automática (Always-On)**:
   - A câmera inicia automaticamente ao abrir a tela de entrada.
   - Implementada solicitação de permissão em tempo real via `ActivityResultLauncher`.
   - Preview integrado diretamente no quadro superior para visualização imediata.

2. **Moldura Verde de Enquadramento (The Target)**:
   - Redesenhada a moldura central para servir de referência de alinhamento.
   - Adicionados cantos destacados (Corner Markers) para facilitar o enquadramento da placa.
   - Efeito visual de "Glow" verde para indicar prontidão de captura.

3. **Fluxo de Trabalho Acelerado**:
   - O operador não precisa mais clicar para abrir a câmera.
   - A leitura de placa (LPR) ocorre continuamente enquanto o visor está aberto.
   - O botão de captura permanece para registro fotográfico definitivo do ticket.

## Alterações Técnicas
- **EntryScreen.kt**: Refatoração completa do visor superior.
- **MainActivity.kt**: Mantida como ponto de entrada limpo.
- **Versão**: 1.0.4 (Build 4).

## Próximos Passos
- Avaliar feedback sobre o tamanho da moldura em diferentes modelos de tablet.
- Testar a velocidade de focagem automática em câmeras de baixo custo.
