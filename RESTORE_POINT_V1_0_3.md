# Ponto de Restauração V1.0.3 - LPR e Gestão de Mídia

**Data:** 25/04/2026
**Commit Base:** Atualizado com suporte a Fotos e LPR

## Funcionalidades Implementadas
1. **Reconhecimento de Placas (LPR)**:
   - Integrado Google ML Kit (Latin) no `EntryScreen.kt`.
   - Filtro de Regex para placas brasileiras (Antigas e Mercosul).
   - Preenchimento automático do campo de placa ao detectar texto válido.

2. **Captura e Otimização de Fotos**:
   - Novo botão de câmera na entrada.
   - Redimensionamento automático para **1024x768** via `ImageUtils.kt`.
   - Compressão JPEG a **75%** para equilíbrio entre nitidez e consumo de banda (aprox. 150KB/foto).
   - Armazenamento local seguro em `filesDir/photos`.

3. **Sincronização de Mídia**:
   - Novo endpoint no servidor: `/api/sync/media` (Multipart/FormData).
   - Lógica de upload em segundo plano no `XSync.kt`.
   - Atualização automática da `photoUrl` no banco de dados do portal.

4. **Conferência na Saída**:
   - Tela de saída agora exibe a foto da entrada.
   - Integração com a biblioteca **Coil** para carregamento assíncrono.
   - Suporte a "Fallback": Tenta carregar foto local primeiro; se não houver, baixa do portal.

## Alterações Técnicas
- **Database (App)**: Versão subiu para **12** (Adicionado campo `photoUrl`).
- **Database (Server)**: Tabela `Ticket` agora possui coluna `photoUrl`.
- **Dependências**: Adicionado `io.coil-kt:coil-compose:2.5.0`.

## Próximos Passos
- Validar performance da câmera em ambientes de baixa luminosidade.
- Implementar limpeza automática de fotos antigas no tablet (ex: após 7 dias).
