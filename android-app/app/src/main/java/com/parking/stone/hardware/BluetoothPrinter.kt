package com.parking.stone.hardware

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.util.Log
import java.io.OutputStream
import java.util.UUID

/**
 * Driver base para impressoras térmicas Bluetooth (ESC/POS)
 * Preparado para expansão futura.
 */
class BluetoothPrinter(private val deviceAddress: String? = null) {
    private val PRINTER_UUID: UUID = UUID.fromString("00001101-0000-1005-8000-00805f9b34fb")
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    fun isEnabled(): Boolean {
        return BluetoothAdapter.getDefaultAdapter()?.isEnabled ?: false
    }

    fun connect(): Boolean {
        if (deviceAddress == null) return false
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            val device = adapter.getRemoteDevice(deviceAddress)
            socket = device.createRfcommSocketToServiceRecord(PRINTER_UUID)
            socket?.connect()
            outputStream = socket?.outputStream
            return true
        } catch (e: Exception) {
            Log.e("BTPrinter", "Erro ao conectar: ${e.message}")
            return false
        }
    }

    fun printText(text: String) {
        try {
            outputStream?.write(text.toByteArray(Charsets.ISO_8859_1))
            outputStream?.write("\n".toByteArray())
        } catch (e: Exception) {
            Log.e("BTPrinter", "Erro ao imprimir texto: ${e.message}")
        }
    }

    fun disconnect() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {}
    }
}
