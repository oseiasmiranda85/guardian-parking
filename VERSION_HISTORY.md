# Histórico de Versões - Parking System

## [1.7.6] - 2026-04-25
- **Correção Crítica de Câmera**: Refatoração do componente de câmera para garantir estabilidade e evitar reinicializações em loop.
- **Correção de Captura**: Garantido que o estado da câmera seja preservado para permitir fotos de entrada/saída.
- **Restauração de Visibilidade**: Verificação de pátio e lista de veículos.

## [1.7.5] - 2026-04-25
- **Correção de API**: Restaurada porta `3000` para comunicação do sistema (resolvido erro 501).
- **Publicação**: Porta `8080` mantida exclusivamente para distribuição de arquivos.

## [1.7.4] - 2026-04-25
- **Ajuste de Servidor**: Alterada URL base para `http://192.168.1.12:8080`.
- **Otimização LPR**: Centralização do componente de câmera e ativação forçada de Flash/Lanterna para melhor reconhecimento em ambientes escuros.
- **Correção de Build**: Resolvido erro de "Conflicting overloads" nas telas de Entrada e Saída.
- **Relatórios Web**: Ajuste na identificação do terminal para exibir o DeviceId real em vez de "POS VIRTUAL".
