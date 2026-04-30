package com.parking.stone.data

import com.parking.stone.data.ApiService
import com.parking.stone.data.model.ParkingEntry
import java.util.Calendar
import java.util.concurrent.TimeUnit

object PricingManager {
    var carPricing: PricingTable? = null
    var motoPricing: PricingTable? = null

    fun getPricingForType(type: String): PricingTable? {
        return if (type.lowercase() == "moto") motoPricing else carPricing
    }

    /**
     * Calculates the fee and checks if it's a refund/courtesy based on the pricing table.
     * Returns Triple(amount, isRefund, durationDescription)
     */
    fun calculate(entry: ParkingEntry, now: Long = System.currentTimeMillis()): Triple<Double, Boolean, String> {
        val durationMillis = now - entry.entryTime
        val totalMinutes = TimeUnit.MILLISECONDS.toMinutes(durationMillis).toInt()
        val hours = TimeUnit.MILLISECONDS.toHours(durationMillis)
        val minutes = TimeUnit.MILLISECONDS.toMinutes(durationMillis) % 60
        val durationDesc = "${hours}h ${minutes}min"

        val pricing = getPricingForType(entry.type)
        if (pricing == null || pricing.slots.isEmpty()) {
            // Fallback to legacy hardcoded logic if no pricing table is synced
            val calculatedHours = Math.ceil(durationMillis.toDouble() / (1000 * 60 * 60)).toInt()
            val isRefund = totalMinutes <= ConfigManager.toleranceMinutes
            val amount = if (isRefund) 0.0 
                        else if (entry.type.lowercase() == "moto") 10.0 + (calculatedHours * 2.0) 
                        else 15.0 + (calculatedHours * 5.0)
            return Triple(amount, isRefund, durationDesc)
        }

        // 1. Check Tolerance (First slot with price 0)
        val toleranceSlot = pricing.slots.find { it.price == 0.0 && it.minMinutes == 0 }
        val isRefund = if (toleranceSlot != null) {
            totalMinutes <= toleranceSlot.maxMinutes
        } else {
            false
        }

        if (isRefund) return Triple(0.0, true, durationDesc)

        // 2. Calculate Price
        if (pricing.type == "FIXED_TIME") {
            // Prepaid/Event logic: find slot that matches CURRENT TIME (HH:mm)
            val sdf = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
            val currentTimeStr = sdf.format(java.util.Date(now))
            
            val matchingSlot = pricing.slots.find { slot ->
                if (slot.startTime == null || slot.endTime == null) return@find false
                isTimeBetween(currentTimeStr, slot.startTime, slot.endTime)
            }
            return Triple(matchingSlot?.price ?: 0.0, false, durationDesc)
        } else {
            // Duration logic: find slot where totalMinutes is between min and max
            val matchingSlot = pricing.slots.find { totalMinutes >= it.minMinutes && totalMinutes <= it.maxMinutes }
            return Triple(matchingSlot?.price ?: 0.0, false, durationDesc)
        }
    }

    private fun isTimeBetween(current: String, start: String, end: String): Boolean {
        // Simple string comparison works for HH:mm if format is consistent
        if (start <= end) {
            return current >= start && current <= end
        } else {
            // Over midnight (e.g., 22:00 to 06:00)
            return current >= start || current <= end
        }
    }
}
