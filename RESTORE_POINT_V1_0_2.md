# Ponto de Restauração V1.0.2 - 25/04/2026

Este documento marca o estado estável e validado do sistema após as correções críticas.

## Funcionalidades Validadas (Não alterar sem aviso):
1. **Regra de Estorno (Tolerância 15 min)**:
   - Identificação automática de veículos com permanência < 15 min.
   - Emissão de "VOUCHER REEMBOLSO" com instrução de ir à ADM.
   - Atualização de status no servidor para `REFUNDED`.
2. **Sincronização de Caixa (CashSession)**:
   - Correção do erro 500 no `upsert` (Campo `deviceId` sincronizado no Prisma).
   - Sessões do Oseias aparecem corretamente no faturamento do portal.
3. **Ocupação do Pátio (Dashboard)**:
   - Lógica robusta: `exitTime == null` define veículo no pátio.
   - Sincronização entre App (11 veículos) e Painel Web validada.
4. **Identidade Visual**:
   - Ícone "Guardian Parking" fixado via PNG para evitar desaparecimento no Android.
   - `versionCode: 3`, `versionName: "1.0.2"`.

## Próximos Passos:
- [A definir pelo usuário]

---
**Status do Repositório**: Git Commit `35d96cd`
