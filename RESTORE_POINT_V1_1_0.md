# Ponto de Restauração V1.1.0 - Suporte Multilinha e Sincronismo de Mídia

**Data:** 25/04/2026
**Versão:** 1.1.0 (Build 10)

## Melhorias Críticas Implementadas

1.  **LPR Multilinha (Motos)**:
    *   Implementada lógica de concatenação de blocos de texto. O sistema agora reconhece placas de moto divididas em duas linhas (Ex: FBI em cima, 5551 embaixo) instantaneamente.
    *   Filtro alfanumérico rigoroso que remove brasões, nomes de cidades e ruídos visuais, focando apenas no padrão de 7 caracteres.

2.  **Protocolo de Mídia Unificado**:
    *   Corrigida a nomenclatura de arquivos no App para bater com o servidor: `/uploads/[tenantId]/[plate]_[entryTime].jpg`.
    *   Isso garante que as fotos capturadas na entrada fiquem visíveis no portal e na tela de saída do App para conferência.

3.  **Relatório de Sessão Refinado**:
    *   Inclusão de contagem de Credenciados e Estornos de Tolerância no fechamento de caixa.
    *   Mudança para "Veículos registrados na sessão" visando clareza operacional.

4.  **Segurança e Privacidade**:
    *   Reafirmada a restrição de dados financeiros para o perfil de Operador. Valores só são exibidos mediante PIN de Gerente.

## Próximos Passos
*   Acompanhar a taxa de reconhecimento em placas de moto muito sujas ou gastas.
*   Verificar o tempo de upload das fotos em conexões 3G/4G instáveis.
