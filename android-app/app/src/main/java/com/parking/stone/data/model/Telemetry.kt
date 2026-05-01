package com.parking.stone.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "telemetry")
data class Telemetry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val deviceId: String,
    val eventType: String, // ENTRY, EXIT, OCR
    val ocrTimeMs: Int? = null,
    val captureTimeMs: Int? = null,
    val totalProcessTimeMs: Int? = null,
    val apiLatencyMs: Int? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)
