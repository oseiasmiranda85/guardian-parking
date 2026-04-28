package com.parking.stone.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue

object ConfigManager {
    enum class PaymentTiming {
        ENTRY, EXIT
    }

    // Mock Configuration (Synced from Web)
    // Change this to PaymentTiming.ENTRY to test the "Pre-Paid" flow
    var paymentTiming by androidx.compose.runtime.mutableStateOf(PaymentTiming.ENTRY)
    
    // Search Configuration
    var allowPlateSearch: Boolean = true
    var allowTicketIdSearch: Boolean = true
    var allowQrSearch: Boolean = true
}
