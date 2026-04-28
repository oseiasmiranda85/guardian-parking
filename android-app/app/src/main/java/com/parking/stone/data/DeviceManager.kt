package com.parking.stone.data

import android.content.Context
import android.provider.Settings

/**
 * Gerencia a identificação única do terminal POS.
 *
 * Formato: POS-XXXXXXXX (primeiros 8 chars do Android ID em maiúsculas)
 * Exemplo: POS-A1B2C3D4
 *
 * O Android ID é estável por instalação do app, único por dispositivo,
 * e é o padrão recomendado para identificação de terminais sem hardware dedicado.
 */
object DeviceManager {

    private var _deviceId: String? = null

    /**
     * Inicializa o DeviceManager com o Context da aplicação.
     * Deve ser chamado no onCreate() da MainActivity ou Application.
     */
    fun init(context: Context) {
        val rawId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "UNKNOWN"

        // Formata como POS-XXXXXXXX (8 chars do ID em maiúsculas)
        _deviceId = "POS-${rawId.take(8).uppercase()}"
    }

    /**
     * Retorna o ID único formatado deste terminal POS.
     * Ex: POS-A1B2C3D4
     */
    val deviceId: String
        get() = _deviceId ?: "POS-UNKNOWN"

    /**
     * Retorna o ID completo para exibição em telas de auditoria.
     * Ex: "Terminal POS-A1B2C3D4"
     */
    val displayName: String
        get() = "Terminal ${deviceId}"
}
