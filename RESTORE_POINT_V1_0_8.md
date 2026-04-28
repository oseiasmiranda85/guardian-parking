# Ponto de Restauração V1.0.8 - LPR Inteligente e Sincronismo de Fotos

**Data:** 25/04/2026
**Versão:** 1.0.8 (Build 8)

## Melhorias Implementadas

1.  **LPR Inteligente (Anti-Ruído)**:
    *   O algoritmo agora filtra palavras comuns em placas como "BRASIL", "MERCOSUL" e nomes de cidades.
    *   Implementada busca por padrão de 7 caracteres *dentro* de blocos de texto, ignorando adesivos e logotipos próximos à placa.
    *   Foco exclusivo no padrão Mercosul (ABC1D23) e Antigo (ABC1234).

2.  **Sincronismo de Fotos (Correção Crítica)**:
    *   Ajustada a rota de mídia no servidor para usar uma janela de tolerância de 1 segundo na comparação de timestamps.
    *   Isso garante que a foto seja vinculada ao ticket correto no portal, resolvendo o problema de fotos não aparecendo.

3.  **Saída por Placa**:
    *   Ativada a leitura de placa automática na tela de Saída.
    *   O sistema agora busca o ticket ativo assim que a placa é enquadrada, eliminando a dependência exclusiva do QR Code ou digitação manual.

4.  **Hardware & Visão Noturna**:
    *   Manutenção do modo Lanterna (Torch) automático na entrada.
    *   Flash forçado em todas as capturas de ticket.

## Próximos Passos
*   Monitorar a performance da bateria com o uso intensivo do flash/lanterna.
*   Validar a velocidade da busca automática na saída em pátios com muitos veículos.
