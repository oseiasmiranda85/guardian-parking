# Guia de Release - Guardian Parking

Este documento define os locais obrigatórios que devem ser atualizados sempre que uma nova versão do aplicativo Android for publicada.

## 📱 1. Android App (L4 POS)
Sempre sincronize a versão nos dois arquivos abaixo:

- **Arquivo:** `android-app/app/build.gradle.kts`
  - `versionCode`: Incrementar +1 (número inteiro)
  - `versionName`: Atualizar para a nova versão (ex: "2.0.6")
- **Arquivo:** `android-app/app/src/main/java/com/parking/stone/ui/screens/LoginScreen.kt`
  - Localizar o texto da versão no rodapé e atualizar.

## 🌐 2. Web Dashboard
O Dashboard deve refletir a disponibilidade da nova versão para os administradores:

- **Arquivo:** `web-dashboard/app/downloads/page.tsx`
  - Atualizar `currentVersion` e `apkUrl`.
  - Adicionar as Notas de Versão (Changelog).
- **Arquivo:** `web-dashboard/app/settings/attendance/page.tsx`
  - Atualizar o texto do banner "Versão X.X.X Disponível" na Central de Atualização.

## 🔴 3. Regra de Ouro (CRÍTICO)
> [!IMPORTANT]
> **Sempre que uma correção for feita (Bug Fix):**
> 1. É OBRIGATÓRIO fazer o deploy total de todas as alterações para o servidor.
> 2. É OBRIGATÓRIO subir a versão (`versionCode` e `versionName`) no app.
> 3. É OBRIGATÓRIO atualizar o banner e as notas de versão na **Página de Downloads** e na **Central Admin**.
> 4. NUNCA entregue uma correção sem disponibilizar o novo APK para download imediato.

## 🚀 3. Procedimento de Deploy
1. Executar `./gradlew assembleRelease` no diretório Android.
2. Copiar o APK para o diretório public da Web:
   ```bash
   cp app/build/outputs/apk/release/app-release.apk ../web-dashboard/public/downloads/guardian-vX.X.X.apk
   cp app/build/outputs/apk/release/app-release.apk ../web-dashboard/public/downloads/guardian-latest.apk
   ```
3. Commit e Push no repositório.

---
*Assinado: Antigravity (IA Coding Assistant)*
