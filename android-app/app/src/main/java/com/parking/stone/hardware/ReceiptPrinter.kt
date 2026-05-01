package com.parking.stone.hardware

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.parking.stone.ParkingApp
import com.parking.stone.data.SessionManager

// Mocking Stone Printer SDK
class ReceiptPrinter {

    private fun sendToRobot(json: String) {
        val robotUrl = "https://guardian-portal-h651.onrender.com/api/admin/printer/push"
        Thread {
            try {
                android.util.Log.d("Printer", "Enviando para: $robotUrl")
                val url = java.net.URL(robotUrl)
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.connectTimeout = 8000
                conn.readTimeout = 8000
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                
                conn.outputStream.use { it.write(json.toByteArray(Charsets.UTF_8)) }
                val code = conn.responseCode
                android.util.Log.d("Printer", "Resposta Servidor Virtual: $code")
                
                if (code !in 200..299) {
                    showError("Erro na Impressão Virtual: $code")
                }
            } catch (e: Exception) {
                android.util.Log.e("Printer", "Falha de conexão: ${e.message}")
                showError("Falha na Rede: Impressão Virtual")
            }
        }.start()
    }

    private fun showError(msg: String) {
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            android.widget.Toast.makeText(ParkingApp.instance, msg, android.widget.Toast.LENGTH_LONG).show()
        }
    }

    fun printEntryTicket(
        eventName: String,
        plate: String,
        type: String,
        amount: String,
        method: String,
        qrContent: String,
        photoPath: String? = null,
        helmetCount: Int = 0
    ): Boolean {
        val timestamp = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date())
        val isMonthly = eventName.contains("MENSALISTA") || eventName.contains("CREDENCIADO") || method == "CREDENTIAL"
        val isCancellation = eventName.contains("CANCEL")
        val isReprint = eventName.contains("VIA") || qrContent.contains("REPRINT")
        val isExit = eventName.contains("SAIDA")
        val isCompact = com.parking.stone.data.ConfigManager.ticketLayout == "COMPACT"
        
        val header = when {
            isCancellation -> "TICKET CANCELADO"
            isMonthly -> "ACESSO AUTORIZADO"
            isReprint -> "SEGUNDA VIA"
            isExit -> "RECIBO"
            else -> "GUARDIAN PARKING"
        }
        
        val steps = mutableListOf<String>()
        
        // Header & Logo
        if (!isCompact) {
            steps.add("""{"type":"IMAGE","base64":"LOGO","fullWidth":false}""")
            steps.add("""{"type":"TEXT","text":"================================\n$header\n================================","align":"CENTER","isBold":true}""")
            steps.add("""{"type":"SPACE"}""")
        } else {
            steps.add("""{"type":"TEXT","text":"$header","align":"CENTER","isBold":true}""")
        }
        
        if (photoPath != null && !isCompact) {
            try {
                val file = java.io.File(photoPath)
                if (file.exists()) {
                    val bytes = file.readBytes()
                    val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    
                    // Resize and Crop for Thermal Printer Efficiency
                    val originalWidth = bitmap.width
                    val originalHeight = bitmap.height
                    
                    // Focus on the middle/lower part (where the plate usually is)
                    val cropY = (originalHeight * 0.2).toInt() // Skip top 20%
                    val cropHeight = (originalHeight * 0.6).toInt() // Take next 60%
                    
                    val matrix = android.graphics.Matrix()
                    matrix.postRotate(0f)
                    val rotatedBitmap = android.graphics.Bitmap.createBitmap(bitmap, 0, cropY, originalWidth, cropHeight, matrix, true)
                    
                    val targetWidth = 384
                    val targetHeight = (rotatedBitmap.height * (targetWidth.toFloat() / rotatedBitmap.width)).toInt()
                    val scaledBitmap = android.graphics.Bitmap.createScaledBitmap(rotatedBitmap, targetWidth, targetHeight, true)
                    
                    val out = java.io.ByteArrayOutputStream()
                    scaledBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 50, out) 
                    val base64 = android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP)
                    
                    steps.add("""{"type":"IMAGE","base64":"data:image/jpeg;base64,$base64","fullWidth":true}""")
                    steps.add("""{"type":"TEXT","text":"FOTO REGISTRADA","align":"CENTER","isBold":false}""")
                }
            } catch (e: Exception) {}
        }

        val details = StringBuilder()
        if (isCompact) {
            details.append(String.format("PLACA: %s | %s\n", plate, type.take(4).uppercase()))
            details.append(String.format("DATA:  %s\n", timestamp))
            details.append(String.format("VALOR: %s | %s", amount, if(method == "PENDENTE") "PEND" else "PAGO"))
        } else {
            if (isMonthly && !isCancellation) {
                details.append(String.format("CLIENTE: %s\n", qrContent)) 
                details.append(String.format("PLACA:   %s\n", plate))
                details.append("VALIDO ATE: 15/05/2026\n") 
            } else {
                details.append(String.format("EVENTO:  %s\n", eventName))
                details.append(String.format("DATA:    %s\n", timestamp))
                details.append(String.format("VEICULO: %s\n", type))
                details.append(String.format("PLACA:   %s\n", plate))
                
                val opName = SessionManager.currentUser?.name?.uppercase() ?: "SISTEMA"
                details.append(String.format("OPERADOR: %s\n", opName))

                if (type.uppercase().contains("MOTO") && helmetCount > 0) {
                    details.append(String.format("CAPACETES: %d\n", helmetCount))
                }
                
                details.append(String.format("VALOR:   %s\n", amount))
                
                val statusLabel = when {
                    isCancellation -> "CANCELADO"
                    method == "PENDENTE" || method == "A PAGAR" -> "PENDENTE"
                    else -> "PAGO"
                }
                details.append(String.format("PAGTO:   %s", statusLabel))
            }
        }
        
        steps.add("""{"type":"TEXT","text":${escapeJson(details.toString())},"align":"LEFT","isBold":true}""")

        if (!isMonthly || isCancellation) {
            if (!isCompact) steps.add("""{"type":"SPACE"}""")
            steps.add("""{"type":"QRCODE","data":"$qrContent"}""")
            if (!isCompact) {
                val qrSub = if(isExit || isCancellation) "COMPROVANTE" else "VALIDACAO DE SAIDA"
                steps.add("""{"type":"TEXT","text":"$qrSub\n================================","align":"CENTER","isBold":true}""")
            }
        }

        if (!isCompact) {
            steps.add("""{"type":"TEXT","text":"TERM: ${com.parking.stone.data.DeviceManager.displayName}","align":"CENTER","isBold":true}""")
        }

        val jsonBuilder = StringBuilder()
        jsonBuilder.append("{")
        jsonBuilder.append("\"steps\": [${steps.joinToString(",")}],")
        jsonBuilder.append("\"eventName\": \"$eventName\",")
        jsonBuilder.append("\"tenantId\": ${com.parking.stone.data.SessionManager.tenantId},")
        jsonBuilder.append("\"terminal\": \"${com.parking.stone.data.DeviceManager.displayName}\",")
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
        
        val steps = mutableListOf<String>()
        steps.add("""{"type":"IMAGE","base64":"LOGO","fullWidth":false}""")
        steps.add("""{"type":"TEXT","text":"================================\nRELATORIO DE CAIXA\n================================","align":"CENTER","isBold":true}""")
        steps.add("""{"type":"SPACE"}""")

        val zReport = StringBuilder()
        zReport.append(String.format("DATA: %s\n", timestamp))
        zReport.append(String.format("TERM: %s\n", terminalId))
        zReport.append(String.format("ID:   %s\n", sessionId.take(8)))
        zReport.append(String.format("OPER: %s\n", operator.uppercase()))
        zReport.append("--------------------------------\n")
        
        zReport.append("RESUMO DE PAGAMENTOS:\n")
        
        // Grouping to ensure unique labels and complete sums
        val groupedStats = paymentStats.groupBy { 
            when(it.paymentMethod?.uppercase()) {
                "CASH", null -> "DINHEIRO"
                "CREDIT" -> "CARTAO CREDITO"
                "DEBIT" -> "CARTAO DEBITO"
                "PIX" -> "PIX / TRANSF"
                "ISENTO" -> "ISENTO"
                "CORTESIA" -> "CORTESIA"
                else -> it.paymentMethod?.uppercase() ?: "DINHEIRO"
            }
        }.map { (label, stats) ->
            label to (stats.sumOf { it.count } to stats.sumOf { it.total })
        }.sortedByDescending { it.first == "DINHEIRO" }

        groupedStats.forEach { (label, data) ->
            val (count, amount) = data
            val line = String.format("%-15s %3d %10.2f", label, count, amount)
            if (label == "DINHEIRO") {
                zReport.append("--------------------------------\n")
                zReport.append("${line.uppercase()}  <--\n")
                zReport.append("--------------------------------\n")
            } else {
                zReport.append("$line\n")
            }
        }
        
        if (accreditedStat.count > 0) {
            zReport.append(String.format("%-15s %3d %10.2f\n", "CREDENCIADOS", accreditedStat.count, 0.0))
        }
        if (toleranceStat.count > 0) {
            zReport.append(String.format("%-15s %3d %10.2f\n", "TOLERANCIA", toleranceStat.count, 0.0))
        }
        
        zReport.append("--------------------------------\n")
        
        zReport.append("ESTORNOS/CANCELADOS:\n")
        zReport.append(String.format("%-15s %3d %10.2f\n", "TOTAIS", cancelledStat.count, cancelledStat.total))
        zReport.append("--------------------------------\n")

        zReport.append("TIPO VEICULO:\n")
        vehicleStats.forEach { stat ->
            val line = String.format("%-15s %3d %10.2f", stat.type.uppercase(), stat.count, stat.total)
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
        val paymentJsonList = groupedStats.map { (label, data) ->
            val (count, amount) = data
            "{\"label\": \"$label\", \"count\": $count, \"total\": $amount}"
        }.toMutableList()
        
        if (accreditedStat.count > 0) paymentJsonList.add("{\"label\": \"CREDENCIADOS\", \"count\": ${accreditedStat.count}, \"total\": 0.0}")
        if (toleranceStat.count > 0) paymentJsonList.add("{\"label\": \"TOLERANCIA\", \"count\": ${toleranceStat.count}, \"total\": 0.0}")

        val json = """
            {
                "steps": [${steps.joinToString(",")}, {"type":"TEXT", "text": ${escapeJson(rawContent)}, "align": "LEFT", "isBold": true}],
                "style": "REPORT",
                "rawContent": ${escapeJson(rawContent)},
                "operator": "$operator",
                "sessionId": "$sessionId",
                "tenantId": ${com.parking.stone.data.SessionManager.tenantId},
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
        
        val steps = mutableListOf<String>()
        steps.add("""{"type":"IMAGE","base64":"LOGO","fullWidth":false}""")
        steps.add("""{"type":"TEXT","text":"================================\nVEICULOS NO PATIO\n================================","align":"CENTER","isBold":true}""")
        steps.add("""{"type":"SPACE"}""")

        val report = StringBuilder()
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
                "steps": [${steps.joinToString(",")}, {"type":"TEXT", "text": ${escapeJson(rawContent)}, "align": "LEFT", "isBold": true}],
                "style": "REPORT",
                "rawContent": ${escapeJson(rawContent)},
                "tenantId": ${com.parking.stone.data.SessionManager.tenantId},
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
