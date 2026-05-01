package com.parking.stone.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(
    tableName = "parking_entries",
    indices = [androidx.room.Index(value = ["plate", "entryTime"], unique = true)]
)
data class ParkingEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val uuid: String = java.util.UUID.randomUUID().toString(), // Global Unique ID
    val plate: String,
    val type: String, // Carro, Moto
    val helmets: Int = 0,
    val entryTime: Long,
    val isPaid: Boolean = false,
    val paymentMethod: String? = null,
    val amount: Double = 0.0,
    val transactionId: String? = null,
    val operatorName: String? = null,
    val photoPath: String? = null,
    val isCancelled: Boolean = false,
    val cancellationReason: String? = null,
    val cancelledTime: Long? = null,
    val cancelledByOperatorId: String? = null,
    val tenantId: Int = -1, // Multi-Tenant ID
    val operatorId: String? = null,
    val billingMode: String = "PREPAID", // PREPAID or POSTPAID
    val category: String = "ROTATIVO", // ROTATIVO, CREDENCIADO
    val accreditedId: String? = null,
    val isSynced: Boolean = false,
    val exitTime: Long? = null,
    val deviceId: String? = null,      // Android ID do POS de entrada (ex: POS-A1B2C3D4)
    val exitDeviceId: String? = null,  // Android ID do POS de saída
    val photoUrl: String? = null       // URL da foto no servidor
)
