package com.parking.stone.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

object ConfigManager {
    private const val PREFS_NAME = "guardian_config"
    private var prefs: SharedPreferences? = null

    enum class PaymentTiming {
        ENTRY, EXIT
    }

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        _requireExitTicket = prefs?.getBoolean("require_exit_ticket", true) ?: true
        _autoRelease = prefs?.getBoolean("auto_release", false) ?: false
        _autoPrintEntry = prefs?.getBoolean("auto_print_entry", false) ?: false
        _paymentTiming = PaymentTiming.valueOf(prefs?.getString("payment_timing", "EXIT") ?: "EXIT")
    }

    private var _paymentTiming by mutableStateOf(PaymentTiming.EXIT)
    var paymentTiming: PaymentTiming
        get() = _paymentTiming
        set(value) {
            _paymentTiming = value
            prefs?.edit()?.putString("payment_timing", value.name)?.apply()
        }
    
    private var _requireExitTicket by mutableStateOf(true)
    var requireExitTicket: Boolean
        get() = _requireExitTicket
        set(value) {
            _requireExitTicket = value
            prefs?.edit()?.putBoolean("require_exit_ticket", value)?.apply()
        }

    private var _autoRelease by mutableStateOf(false)
    var autoRelease: Boolean
        get() = _autoRelease
        set(value) {
            _autoRelease = value
            prefs?.edit()?.putBoolean("auto_release", value)?.apply()
        }

    private var _autoPrintEntry by mutableStateOf(false)
    var autoPrintEntry: Boolean
        get() = _autoPrintEntry
        set(value) {
            _autoPrintEntry = value
            prefs?.edit()?.putBoolean("auto_print_entry", value)?.apply()
        }

    var allowPlateSearch: Boolean = true
    var allowTicketIdSearch: Boolean = true
    var allowQrSearch: Boolean = true
}
