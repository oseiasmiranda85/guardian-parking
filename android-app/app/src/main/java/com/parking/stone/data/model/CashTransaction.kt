package com.parking.stone.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cash_transactions")
data class CashTransaction(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String, // FK to CashSession
    val type: String, // ENTRY, EXIT, MANUAL_ADJUSTMENT
    val amount: Double,
    val timestamp: Long,
    val description: String? = null,
    val operatorId: String? = null
)
