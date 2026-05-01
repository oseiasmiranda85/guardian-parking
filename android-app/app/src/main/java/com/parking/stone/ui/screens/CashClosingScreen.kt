package com.parking.stone.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.parking.stone.data.AppDatabase
import com.parking.stone.data.SessionManager
import com.parking.stone.data.model.UserRole
import com.parking.stone.hardware.ReceiptPrinter
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun CashClosingScreen(navController: NavController) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    
    // Auth State
    var managerPin by remember { mutableStateOf("") }
    var isAuthenticated by remember { mutableStateOf(false) }
    var isAuthenticating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    // Session State
    var startTime by remember { mutableStateOf(0L) }
    var operatorName by remember { mutableStateOf("") }
    var operatorId by remember { mutableStateOf(0) }
    var entriesInSession by remember { mutableStateOf(0) }
    var totalRevenue by remember { mutableStateOf(0.0) }
    
    // Statistics State
    var paymentStats by remember { mutableStateOf<List<com.parking.stone.data.PaymentStat>>(emptyList()) }
    var vehicleStats by remember { mutableStateOf<List<com.parking.stone.data.VehicleStat>>(emptyList()) }
    var cancelledStat by remember { mutableStateOf(com.parking.stone.data.CancelledStat(0, 0.0)) }
    var accreditedStat by remember { mutableStateOf(com.parking.stone.data.SimpleStat(0, 0.0)) }
    var toleranceStat by remember { mutableStateOf(com.parking.stone.data.SimpleStat(0, 0.0)) }
    var grandTotal by remember { mutableStateOf(0.0) }
    
    // Load Session Data
    LaunchedEffect(Unit) {
        val db = AppDatabase.getDatabase(context)
        val session = db.cashDao().getCurrentOpenSession(SessionManager.tenantId)
        
        if (session != null) {
            startTime = session.startTime
            operatorName = session.userName
            operatorId = session.userId
            val opIdStr = operatorId.toString()
            
            // Force sync to get latest data from cloud before showing report
            try {
                com.parking.stone.data.XSync(db.parkingDao()).syncTickets(context)
            } catch (e: Exception) { e.printStackTrace() }
            
            val pStats = db.parkingDao().getPaymentStats(opIdStr, startTime, SessionManager.tenantId)
            val vStats = db.parkingDao().getVehicleStats(opIdStr, startTime, SessionManager.tenantId)
            val cStat = db.parkingDao().getCancelledStats(opIdStr, startTime, SessionManager.tenantId)
            val aStat = db.parkingDao().getAccreditedStats(opIdStr, startTime, SessionManager.tenantId)
            val tStat = db.parkingDao().getToleranceStats(opIdStr, startTime, SessionManager.tenantId)
            
            entriesInSession = db.parkingDao().getOperatorEntryCount(opIdStr, startTime, SessionManager.tenantId)
            
            paymentStats = pStats
            vehicleStats = vStats
            cancelledStat = cStat
            accreditedStat = aStat
            toleranceStat = tStat
            grandTotal = pStats.sumOf { it.total }
            totalRevenue = grandTotal
        } else {
            Toast.makeText(context, "Nenhum caixa aberto.", Toast.LENGTH_SHORT).show()
            navController.popBackStack()
        }
    }
    val pinTextStyle = LocalTextStyle.current.copy(
        textAlign = TextAlign.Center,
        letterSpacing = 8.sp,
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // TOP BAR
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { 
                if (isAuthenticated) isAuthenticated = false else navController.popBackStack() 
            }) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
            }
            Text(
                if (isAuthenticated) "Resumo de Caixa" else "Fechamento", 
                style = MaterialTheme.typography.titleLarge, 
                color = Color.White, 
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (!isAuthenticated) {
            // AUTH SCREEN
            Icon(Icons.Default.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(64.dp))
            Spacer(modifier = Modifier.height(24.dp))
            Text("Autorização Requerida", style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
            Text("Insira o PIN de Gerente para fechar o caixa", color = Color.Gray)
            
            Spacer(modifier = Modifier.height(32.dp))
            
            OutlinedTextField(
                value = managerPin,
                onValueChange = { if (it.length <= 4) managerPin = it },
                label = { Text("PIN de 4 dígitos") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = { focusManager.clearFocus() }
                ),
                modifier = Modifier.width(200.dp),
                textStyle = pinTextStyle,
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
            )
            
            if (error != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(error!!, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = { 
                    if (managerPin.length < 4) {
                        error = "PIN deve ter 4 dígitos"
                        return@Button
                    }
                    isAuthenticating = true
                    scope.launch {
                        try {
                            val response = com.parking.stone.data.NetworkModule.api.authorizePin(
                                mapOf("pin" to managerPin, "tenantId" to SessionManager.tenantId.toString())
                            )
                            if (response.success) {
                                isAuthenticated = true
                                error = null
                                Toast.makeText(context, "Bem-vindo, ${response.user.name}", Toast.LENGTH_SHORT).show()
                            } else {
                                error = "PIN Inválido"
                            }
                        } catch (e: Exception) {
                            error = "PIN Inválido ou Sem Permissão"
                        }
                        isAuthenticating = false
                    }
                },
                modifier = Modifier.fillMaxWidth().height(60.dp),
                enabled = !isAuthenticating,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.Black)
            ) {
                if (isAuthenticating) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black)
                else Text("CONFIRMAR PIN", fontWeight = FontWeight.Bold)
            }
        } else {
            // SUMMARY SCREEN
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Sessão Atual", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                    DetailRow("Operador", operatorName.uppercase())
                    DetailRow("Abertura", SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(Date(startTime)))
                    DetailRow("Veículos registrados na sessão", "$entriesInSession")
                    
                    if (accreditedStat.count > 0) {
                        DetailRow("Credenciados registrados", "${accreditedStat.count} un")
                    }
                    
                    Divider(color = Color.Gray.copy(alpha=0.3f))
                    
                    Text("Resumo de Faturamento", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                    
                    // Group and map stats for display
                    val displayStats = paymentStats.groupBy { 
                        when(it.paymentMethod?.uppercase()) {
                            "CREDIT" -> "Cartão Crédito"
                            "DEBIT" -> "Cartão Débito"
                            "PIX" -> "PIX / Transf"
                            "CASH", null -> "Dinheiro"
                            "ISENTO" -> "Isento"
                            "CORTESIA" -> "Cortesia"
                            else -> it.paymentMethod ?: "Dinheiro"
                        }
                    }.map { (label, stats) ->
                        label to (stats.sumOf { it.count } to stats.sumOf { it.total })
                    }.sortedByDescending { it.first == "Dinheiro" }

                    displayStats.forEach { (label, data) ->
                        val (count, total) = data
                        val isCash = label == "DINHEIRO"
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(label, color = if (isCash) Color.White else Color.Gray, fontWeight = if (isCash) FontWeight.Bold else FontWeight.Normal)
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("$count un", color = Color.Gray, fontSize = 12.sp)
                                Text("R$ %.2f".format(total), color = if (isCash) MaterialTheme.colorScheme.primary else Color.White, fontWeight = if (isCash) FontWeight.Bold else FontWeight.Normal)
                            }
                        }
                    }
                    
                    if (toleranceStat.count > 0) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Estornos de Tolerância", color = Color.Gray)
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("${toleranceStat.count} un", color = Color.Gray, fontSize = 12.sp)
                                Text("R$ 0,00", color = Color.White)
                            }
                        }
                    }

                    if (cancelledStat.count > 0) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Tickets Cancelados", color = Color.Red, fontWeight = FontWeight.Bold)
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("${cancelledStat.count} un", color = Color.Gray, fontSize = 12.sp)
                                Text("R$ %.2f".format(cancelledStat.total), color = Color.Red)
                            }
                        }
                    }
                    
                    Divider(color = Color.Gray.copy(alpha=0.3f))
                    DetailRow("TOTAL GERAL", "R$ %.2f".format(grandTotal), isTotal = true)

                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Tipos de Veículo", style = MaterialTheme.typography.titleSmall, color = Color.Gray)
                    vehicleStats.forEach { stat -> 
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(stat.type, color = Color.Gray, fontSize = 14.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("${stat.count} un", color = Color.Gray, fontSize = 12.sp)
                                Text("R$ %.2f".format(stat.total), color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                             val db = AppDatabase.getDatabase(context)
                             val session = db.cashDao().getCurrentOpenSession(SessionManager.tenantId)
                             if (session != null) {
                                 ReceiptPrinter().printZReport(session.id, operatorName, grandTotal, paymentStats, vehicleStats, cancelledStat, accreditedStat, toleranceStat)
                                 Toast.makeText(context, "Relatório Impresso!", Toast.LENGTH_SHORT).show()
                             }
                        }
                    },
                    modifier = Modifier.weight(1f).height(60.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White)
                ) { Text("IMPRIMIR") }

                Button(
                    onClick = {
                        scope.launch {
                            val db = AppDatabase.getDatabase(context)
                            val session = db.cashDao().getCurrentOpenSession(SessionManager.tenantId)
                            if (session != null) {
                                db.cashDao().closeSession(session.id, System.currentTimeMillis(), 0.0, grandTotal)
                                ReceiptPrinter().printZReport(session.id, operatorName, grandTotal, paymentStats, vehicleStats, cancelledStat, accreditedStat, toleranceStat)
                                com.parking.stone.data.XSync(db.parkingDao()).apply { syncTickets(context); syncSessions() }
                                SessionManager.logout(context)
                                navController.navigate("login") { popUpTo(0) }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f).height(60.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.Black)
                ) { Text("FECHAR CAIXA", fontWeight = FontWeight.Bold) }
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String, isTotal: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = if (isTotal) Color.White else Color.Gray, fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal)
        Text(value, color = if (isTotal) MaterialTheme.colorScheme.primary else Color.White, fontWeight = if (isTotal) FontWeight.Bold else FontWeight.Normal)
    }
}
