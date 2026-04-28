package com.parking.stone.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cash_sessions")
data class CashSession(
    @PrimaryKey val id: String, // UUID
    val userId: Int,
    val deviceId: String? = null,
    val userName: String,
    val startTime: Long,
    val endTime: Long? = null,
    val startBalance: Double = 0.0,
    val closingBalance: Double? = null, // Total cash physically counted
    val totalRevenue: Double = 0.0,     // Computed system total
    val status: String = "OPEN", // OPEN, CLOSED
    val tenantId: Int = -1
)
