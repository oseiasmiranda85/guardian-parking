package com.parking.stone.hardware

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Mocking Stone Printer SDK
class ReceiptPrinter {

    private fun sendToRobot(json: String) {
        Thread {
            val targets = listOf(
                "https://webhook.site/c2196296-7ff1-485d-966f-52f40e25931c",
                "http://10.0.2.2:3333/generate-ticket"
            )
            for (robotUrl in targets) {
                try {
                    val url = java.net.URL(robotUrl)
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.connectTimeout = 1000
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true
                    
                    conn.outputStream.use { it.write(json.toByteArray()) }
                    if (conn.responseCode == 200) {
                        break
                    }
                } catch (e: Exception) {}
            }
        }.start()
    }

    fun printEntryTicket(
        eventName: String,
        plate: String,
        type: String,
        amount: String,
        method: String,
        qrContent: String,
        photoPath: String? = null
    ): Boolean {
        val timestamp = SimpleDateFormat("dd/MM/yyyy, HH:mm:ss", Locale.getDefault()).format(Date())
        val isMonthly = eventName.contains("MENSALISTA") || eventName.contains("CREDENCIADO") || method == "CREDENTIAL"
        val isCancellation = eventName.contains("CANCEL")
        val isReprint = eventName.contains("VIA") || qrContent.contains("REPRINT")
        val isExit = eventName.contains("SAIDA")
        
        val header = when {
            isCancellation -> "TICKET CANCELADO"
            isMonthly -> "ACESSO AUTORIZADO"
            isReprint -> "SEGUNDA VIA DE TICKET"
            isExit -> "RECIBO DE PAGAMENTO"
            else -> "GUARDIAN PARKING"
        }
        
        val steps = mutableListOf<String>()
        
        // Simulating: printer.printImage(logo)
        // Here we send a placeholder logo signal for the dumb robot
        steps.add("""{"type":"IMAGE","base64":"LOGO","fullWidth":false}""")
        
        // Simulating: printer.printText(header, align=CENTER)
        steps.add("""{"type":"TEXT","text":"================================\n$header\n================================","align":"CENTER","isBold":true}""")
        steps.add("""{"type":"SPACE"}""")
        
        if (photoPath != null) {
            try {
                val file = java.io.File(photoPath)
                if (file.exists()) {
                    val bytes = file.readBytes()
                    val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    val out = java.io.ByteArrayOutputStream()
                    bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 40, out) 
                    val base64 = android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP)
                    
                    // Simulating: printer.printImage(photo)
                    steps.add("""{"type":"IMAGE","base64":"data:image/jpeg;base64,$base64","fullWidth":true}""")
                    steps.add("""{"type":"TEXT","text":"FOTO REGISTRADA NA ENTRADA","align":"CENTER","isBold":false}""")
                    steps.add("""{"type":"SPACE"}""")
                }
            } catch (e: Exception) {}
        }

        val details = StringBuilder()
        if (isMonthly && !isCancellation) {
            details.append(String.format("CLIENTE: %s\n", qrContent)) 
            details.append(String.format("PLACA:   %s\n", plate))
            details.append("VALIDO ATE: 15/05/2026\n") 
        } else {
            details.append(String.format("EVENTO:  %s\n", eventName))
            details.append(String.format("DATA:    %s\n", timestamp))
            details.append(String.format("VEICULO: %s\n", type))
            details.append(String.format("PLACA:   %s\n", plate))
            details.append(String.format("VALOR:   %s\n", amount))
            
            val statusLabel = when {
                isCancellation -> "CANCELADO"
                method == "PENDENTE" || method == "A PAGAR" -> "PENDENTE"
                else -> "PAGO"
            }
            details.append(String.format("PAGTO:   %s", statusLabel))
        }
        
        steps.add("""{"type":"TEXT","text":${escapeJson(details.toString())},"align":"LEFT","isBold":true}""")
        steps.add("""{"type":"SPACE"}""")

        if (!isMonthly || isCancellation) {
            // Simulating: printer.printQrCode(qrContent)
            steps.add("""{"type":"QRCODE","data":"$qrContent"}""")
            val qrSub = if(isExit || isCancellation) "COMPROVANTE" else "VALIDACAO DE SAIDA"
            steps.add("""{"type":"TEXT","text":"$qrSub\n================================","align":"CENTER","isBold":true}""")
        }

        steps.add("""{"type":"TEXT","text":"TERM: ${com.parking.stone.data.DeviceManager.displayName}","align":"CENTER","isBold":true}""")

        val jsonBuilder = StringBuilder()
        jsonBuilder.append("{")
        jsonBuilder.append("\"steps\": [${steps.joinToString(",")}],")
        jsonBuilder.append("\"eventName\": \"$eventName\",")
        jsonBuilder.append("\"timestamp\": \"$timestamp\"")
        jsonBuilder.append("}")
        
        sendToRobot(jsonBuilder.toString())
        return true
    }

    fun printZReport(
        sessionId: String, 
        operator: String, 
        total: Double,
        paymentStats: List<com.parking.stone.data.PaymentStat>,
        vehicleStats: List<com.parking.stone.data.VehicleStat>,
        cancelledStat: com.parking.stone.data.CancelledStat,
        accreditedStat: com.parking.stone.data.SimpleStat,
        toleranceStat: com.parking.stone.data.SimpleStat
    ) {
        val timestamp = SimpleDateFormat("dd/MM/yyyy, HH:mm:ss", Locale.getDefault()).format(Date())
        val terminalId = com.parking.stone.data.DeviceManager.displayName
        
        val zReport = StringBuilder()
        zReport.append("        GUARDIAN\n")
        zReport.append("     PARKING SYSTEM\n\n")
        zReport.append("================================\n")
        zReport.append("       RELATORIO DE CAIXA\n")
        zReport.append("================================\n")
        zReport.append(String.format("DATA: %s\n", timestamp))
        zReport.append(String.format("TERM: %s\n", terminalId))
        zReport.append(String.format("ID:   %s\n", sessionId.take(8)))
        zReport.append(String.format("OPER: %s\n", operator))
        zReport.append("--------------------------------\n")
        
        zReport.append("RESUMO DE PAGAMENTOS:\n")
        paymentStats.forEach { stat ->
            val label = when(stat.paymentMethod) {
                "CASH" -> "DINHEIRO"
                "CREDIT" -> "CREDITO"
                "DEBIT" -> "DEBITO"
                "PIX" -> "PIX"
                else -> "OUTROS"
            }
            val line = String.format("%-12s %3d %8.2f", label, stat.count, stat.total)
            zReport.append("$line\n")
        }
        
        if (accreditedStat.count > 0) {
            zReport.append(String.format("%-12s %3d %8.2f\n", "CREDENCIADOS", accreditedStat.count, 0.0))
        }
        if (toleranceStat.count > 0) {
            zReport.append(String.format("%-12s %3d %8.2f\n", "TOLERANCIA", toleranceStat.count, 0.0))
        }
        
        zReport.append("--------------------------------\n")
        
        zReport.append("ESTORNOS/CANCELADOS:\n")
        zReport.append(String.format("%-16s %3d %8.2f\n", "TOTAIS", cancelledStat.count, cancelledStat.total))
        zReport.append("--------------------------------\n")

        zReport.append("TIPO VEICULO:\n")
        vehicleStats.forEach { stat ->
            val line = String.format("%-16s %3d %8.2f", stat.type.uppercase(), stat.count, stat.total)
            zReport.append("$line\n")
        }
        zReport.append("--------------------------------\n")
        
        zReport.append(String.format("TOTAL GERAL:      R$ %8.2f\n", total))
        zReport.append("================================\n\n")
        zReport.append("ASSINATURA GERENTE:\n\n")
        zReport.append("________________________________\n")
        zReport.append("\n\n\n") 

        val rawContent = zReport.toString()
        println(rawContent)

        // JSON for Robot
        val paymentJsonList = paymentStats.map { stat ->
            val label = when(stat.paymentMethod) {
                "CASH" -> "DINHEIRO"
                "CREDIT" -> "CREDITO"
                "DEBIT" -> "DEBITO"
                "PIX" -> "PIX"
                else -> "OUTROS"
            }
            "{\"label\": \"$label\", \"count\": ${stat.count}, \"total\": ${stat.total}}"
        }.toMutableList()
        
        if (accreditedStat.count > 0) paymentJsonList.add("{\"label\": \"CREDENCIADOS\", \"count\": ${accreditedStat.count}, \"total\": 0.0}")
        if (toleranceStat.count > 0) paymentJsonList.add("{\"label\": \"TOLERANCIA\", \"count\": ${toleranceStat.count}, \"total\": 0.0}")

        val json = """
            {
                "style": "INVENTORY",
                "rawContent": ${escapeJson(rawContent)},
                "operator": "$operator",
                "sessionId": "$sessionId",
                "total": $total,
                "paymentStats": [${paymentJsonList.joinToString(",")}],
                "terminal": "$terminalId",
                "timestamp": "$timestamp",
                "cancelledCount": ${cancelledStat.count},
                "cancelledTotal": ${cancelledStat.total}
            }
        """.trimIndent()
        
        sendToRobot(json)
    }

    fun printInventoryReport(vehicles: List<com.parking.stone.data.model.ParkingEntry>): Boolean {
        val timestamp = SimpleDateFormat("dd/MM/yyyy, HH:mm:ss", Locale.getDefault()).format(Date())
        
        val report = StringBuilder()
        report.append("        GUARDIAN\n")
        report.append("     PARKING SYSTEM\n\n")
        report.append("================================\n")
        report.append("      VEICULOS NO PATIO\n")
        report.append("================================\n")
        report.append(String.format("DATA: %s\n", timestamp))
        report.append(String.format("TERM: %s\n", com.parking.stone.data.DeviceManager.displayName))
        report.append("--------------------------------\n")
        
        if (vehicles.isEmpty()) {
            report.append("\n    PATIO VAZIO NO MOMENTO\n\n")
        } else {
            vehicles.forEach { v ->
                val entryTime = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(v.entryTime))
                val line = String.format("%-8s | %-8s | %s", v.plate, v.type.take(8), entryTime)
                report.append("$line\n")
            }
        }
        
        report.append("--------------------------------\n")
        report.append(String.format("TOTAL DE VEICULOS: %d\n", vehicles.size))
        report.append("================================\n")
        
        val rawContent = report.toString()
        println(rawContent)

        val json = """
            {
                "style": "INVENTORY",
                "rawContent": ${escapeJson(rawContent)},
                "terminal": "${com.parking.stone.data.DeviceManager.displayName}",
                "timestamp": "$timestamp"
            }
        """.trimIndent()
        
        sendToRobot(json)
        return true
    }

    private fun escapeJson(text: String): String {
        return "\"" + text.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\b", "\\b")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t") + "\""
    }
}
