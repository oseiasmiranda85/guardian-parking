package com.parking.stone.data

import android.content.Context
import com.parking.stone.data.model.Telemetry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object TelemetryManager {
    fun logEvent(
        context: Context,
        eventType: String,
        ocrTime: Int? = null,
        captureTime: Int? = null,
        totalProcessTime: Int? = null,
        apiLatency: Int? = null
    ) {
        val scope = CoroutineScope(Dispatchers.IO)
        scope.launch {
            try {
                val db = AppDatabase.getDatabase(context)
                val telemetry = Telemetry(
                    deviceId = DeviceManager.deviceId,
                    eventType = eventType,
                    ocrTimeMs = ocrTime,
                    captureTimeMs = captureTime,
                    totalProcessTimeMs = totalProcessTime,
                    apiLatencyMs = apiLatency
                )
                db.telemetryDao().insert(telemetry)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
