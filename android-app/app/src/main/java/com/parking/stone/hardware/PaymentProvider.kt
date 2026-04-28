package com.parking.stone.hardware

import kotlinx.coroutines.delay

enum class PaymentMethod {
    CREDIT, DEBIT, PIX, CASH
}

data class PaymentResult(
    val success: Boolean,
    val transactionId: String?,
    val message: String
)

interface PaymentProvider {
    suspend fun processPayment(amount: Double, method: PaymentMethod): PaymentResult
}

// Mock implementation simulating Stone SDK behavior
class StonePaymentProvider : PaymentProvider {
    
    override suspend fun processPayment(amount: Double, method: PaymentMethod): PaymentResult {
        // Simulate network/hardware delay
        delay(2000)
        
        // Mock success (User would interact with the PIN pad here in real life)
        return PaymentResult(
            success = true,
            transactionId = "STONE-Tx-${System.currentTimeMillis()}",
            message = "Approved"
        )
    }
}
