package com.parking.stone.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.parking.stone.data.AppDatabase
import com.parking.stone.data.model.ParkingEntry
import com.parking.stone.hardware.PaymentMethod
import com.parking.stone.hardware.ReceiptPrinter
import com.parking.stone.hardware.StonePaymentProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import androidx.compose.foundation.border
import androidx.compose.ui.draw.clip
import com.parking.stone.data.SessionManager
import com.parking.stone.hardware.HybridAnalyzer
import androidx.camera.view.PreviewView
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors
import android.view.ViewGroup
import android.util.Log

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExitScreen(navController: NavController, initialPlate: String? = null) {
    var query by remember { mutableStateOf(initialPlate ?: "") }
    var foundEntry by remember { mutableStateOf<ParkingEntry?>(null) }
    var paymentMethod by remember { mutableStateOf("CREDIT") }
    var isProcessing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var calculatedFee by remember { mutableStateOf(0.0) }
    var durationString by remember { mutableStateOf("") }
    var isRefundVoucher by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = AppDatabase.getDatabase(context)
    
    // Recent Entries List
    var recentEntries by remember { mutableStateOf<List<ParkingEntry>>(emptyList()) }

    // Trigger search if initialPlate is provided
    LaunchedEffect(initialPlate) {
        if (initialPlate != null && initialPlate.length >= 7) {
            val result = db.parkingDao().getActiveEntryByPlate(initialPlate, SessionManager.tenantId)
            if (result != null) {
                foundEntry = result
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (foundEntry == null) {
            // --- SCANNING MODE ---
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                CameraPreview(
                    onPlateDetected = { plate -> 
                        if (foundEntry == null) {
                            scope.launch {
                                val tenantId = SessionManager.tenantId
                                val isNumeric = plate.all { it.isDigit() }
                                val entry = if (isNumeric) {
                                    db.parkingDao().getEntryById(plate.toLongOrNull() ?: -1).let { if(it?.tenantId == tenantId && it.exitTime == null) it else null }
                                } else {
                                    db.parkingDao().getActiveEntryByPlate(plate, tenantId)
                                }

                                if (entry != null) {
                                    val now = System.currentTimeMillis()
                                    val durationMillis = now - entry.entryTime
                                    val hours = TimeUnit.MILLISECONDS.toHours(durationMillis)
                                    val minutes = TimeUnit.MILLISECONDS.toMinutes(durationMillis) % 60
                                    durationString = "${hours}h ${minutes}min"
                                    
                                    // AUTO RELEASE LOGIC: If PAID, exit immediately
                                    if (entry.isPaid) {
                                        val updated = entry.copy(
                                            exitTime = System.currentTimeMillis(),
                                            isSynced = false,
                                            exitDeviceId = com.parking.stone.data.DeviceManager.deviceId
                                        )
                                        db.parkingDao().updateEntry(updated)
                                        ReceiptPrinter().printEntryTicket("SAIDA", updated.plate, updated.type, "R$ %.2f".format(updated.amount), updated.paymentMethod ?: "PAGO", "DONE", updated.photoPath)
                                        
                                        withContext(Dispatchers.IO) { com.parking.stone.data.XSync(db.parkingDao()).syncTickets(context) }
                                        recentEntries = db.parkingDao().getActiveEntries(SessionManager.tenantId)
                                        android.widget.Toast.makeText(context, "SAÍDA LIBERADA: ${entry.plate}", android.widget.Toast.LENGTH_LONG).show()
                                    } else {
                                        // Show for payment
                                        foundEntry = entry
                                        val totalMinutesLocal = TimeUnit.MILLISECONDS.toMinutes(durationMillis)
                                        isRefundVoucher = totalMinutesLocal <= 15
                                        calculatedFee = if (isRefundVoucher) 0.0 
                                                       else if (entry.category == "CREDENCIADO") 0.0 
                                                       else (if (entry.type == "Moto") 10.0 + (hours * 2.0) else 15.0 + (hours * 5.0))
                                    }
                                }
                            }
                        }
                    },
                    onCaptureReady = {}
                )
                Box(
                    modifier = Modifier
                        .size(280.dp)
                        .align(Alignment.Center)
                        .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp))
                ) {
                    Box(modifier = Modifier.fillMaxWidth().height(2.dp).background(Color.Red).align(Alignment.Center))
                }
                Text(
                    "Aponte para o QR Ticket ou Placa", 
                    modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp),
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                IconButton(
                    onClick = { navController.popBackStack() },
                    modifier = Modifier.align(Alignment.TopStart).padding(16.dp),
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Black.copy(alpha = 0.5f))
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
                }
            }
            
            Column(
                modifier = Modifier
                    .weight(1.2f)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(24.dp)
            ) {
                Text("Busca Manual", style = MaterialTheme.typography.titleMedium, color = Color.White)
                
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it.uppercase(); error = null },
                    label = { Text("Placa ou Nº do Ticket") },
                    trailingIcon = {
                        IconButton(onClick = {
                            if (query.isNotEmpty()) {
                                scope.launch {
                                    val tenantId = SessionManager.tenantId
                                    val isNumeric = query.all { it.isDigit() }
                                    val entry = if (isNumeric) {
                                        db.parkingDao().getEntryById(query.toLongOrNull() ?: -1).let { if(it?.tenantId == tenantId) it else null }
                                    } else {
                                        db.parkingDao().getActiveEntryByPlate(query, tenantId)
                                    }

                                    if (entry != null) {
                                        val now = System.currentTimeMillis()
                                        val durationMillis = now - entry.entryTime
                                        val hours = TimeUnit.MILLISECONDS.toHours(durationMillis)
                                        val minutes = TimeUnit.MILLISECONDS.toMinutes(durationMillis) % 60
                                        val totalMinutesLocal = TimeUnit.MILLISECONDS.toMinutes(durationMillis)
                                        durationString = "${hours}h ${minutes}min"
                                        
                                        foundEntry = entry
                                        
                                        // LOGIC: 15 Minutes Tolerance / Refund
                                        isRefundVoucher = totalMinutesLocal <= 15
                                        
                                        if (isRefundVoucher) {
                                            if (entry.isPaid) {
                                                // If already paid, it's a REFUND (Estorno)
                                                calculatedFee = entry.amount
                                            } else {
                                                // If not paid, it's a FREE EXIT (Isento)
                                                calculatedFee = 0.0
                                            }
                                        } else {
                                            if (entry.isPaid) {
                                                calculatedFee = 0.0 // No more to pay
                                            } else {
                                                if (entry.category == "CREDENCIADO" || entry.amount == 0.0) {
                                                    calculatedFee = 0.0
                                                } else {
                                                    // Calculation logic based on vehicle type
                                                    calculatedFee = if (entry.type == "Moto") 10.0 + (hours * 2.0) else 15.0 + (hours * 5.0)
                                                }
                                            }
                                        }
                                    } else {
                                        error = "Ticket não encontrado ou já saiu."
                                    }
                                }
                            }
                        }) {
                            Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.primary)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                    singleLine = true
                )
                
                if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error)

                if (isRefundVoucher && foundEntry != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, null, tint = Color.White, modifier = Modifier.size(32.dp))
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text("ALERTA DE TOLERÂNCIA", fontWeight = FontWeight.Bold, color = Color.White)
                                Text(
                                    if (foundEntry!!.isPaid) "Tempo: $durationString. EMITIR VOUCHER DE REEMBOLSO!"
                                    else "Tempo: $durationString. SAÍDA ISENTA!",
                                    color = Color.White.copy(alpha = 0.9f),
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                Text("Veículos no Pátio", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
                
                LaunchedEffect(query) {
                    if (query.isEmpty()) {
                        recentEntries = db.parkingDao().getActiveEntries(SessionManager.tenantId)
                    }
                }

                androidx.compose.foundation.lazy.LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth().weight(1f)
                ) {
                    val filtered = if (query.isEmpty()) recentEntries else recentEntries.filter { it.plate.contains(query) }
                    items(filtered.size) { i ->
                        val item = filtered[i]
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f)),
                            onClick = { query = item.plate },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column {
                                    Text(item.plate, fontWeight = FontWeight.Bold, color = Color.White)
                                    Text(item.type, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                }
                                Text(SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(item.entryTime)), color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        } else {
            // --- CONFERENCIA / PAGAMENTO MODE ---
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).background(MaterialTheme.colorScheme.surface).padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("Saída / Conferência", style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.Bold)
                
                // Photo Section (Requirement: Verify plate vs photo)
                Text("Foto da Entrada", style = MaterialTheme.typography.titleMedium, color = Color.Gray)
                Box(
                    modifier = Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(12.dp)).background(Color.DarkGray),
                    contentAlignment = Alignment.Center
                ) {
                    val photoModel = if (foundEntry!!.photoPath != null && java.io.File(foundEntry!!.photoPath!!).exists()) {
                        foundEntry!!.photoPath
                    } else if (foundEntry!!.photoUrl != null) {
                        com.parking.stone.data.NetworkModule.BASE_URL.removeSuffix("/") + foundEntry!!.photoUrl
                    } else {
                        null
                    }

                    if (photoModel != null) {
                        coil.compose.AsyncImage(
                            model = photoModel,
                            contentDescription = "Foto da Placa",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop
                        )
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.CameraAlt, null, tint = Color.Gray, modifier = Modifier.size(48.dp))
                            Text("Sem foto disponível", color = Color.White.copy(alpha=0.6f))
                        }
                    }
                }

                Card(colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha=0.1f)), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                         DetailRow("Placa", foundEntry!!.plate)
                         DetailRow("Status", if(foundEntry!!.isPaid) "PAGO (PRÉ-PAGO)" else "AGUARDANDO PAGTO")
                         DetailRow("Permanência", durationString)
                         Spacer(modifier = Modifier.height(8.dp))
                         Divider(color = Color.White.copy(alpha=0.2f))
                         Spacer(modifier = Modifier.height(8.dp))
                         Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                             Text(if(foundEntry!!.isPaid) "TOTAL PAGO" else "TOTAL", style = MaterialTheme.typography.titleLarge, color = Color.White, fontWeight = FontWeight.Bold)
                             Text("R$ %.2f".format(if(foundEntry!!.isPaid) foundEntry!!.amount else calculatedFee), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                         }
                    }
                }
                
                if (!foundEntry!!.isPaid) {
                    Text("Forma de Pagamento", style = MaterialTheme.typography.titleMedium, color = Color.Gray)
                    Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("CREDIT" to "Crédito", "DEBIT" to "Débito", "PIX" to "Pix", "CASH" to "Dinheiro").forEach { (key, label) ->
                            FilterChip(selected = paymentMethod == key, onClick = { paymentMethod = key }, label = { Text(label) }, colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.Black))
                        }
                    }
                } else if (isRefundVoucher) {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.error.copy(alpha=0.1f)), modifier = Modifier.fillMaxWidth()) {
                         Text("TOLERÂNCIA: Emitir voucher de estorno.", modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.error)
                    }
                }
                
                Spacer(modifier = Modifier.weight(1f))
                
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Button(onClick = { foundEntry = null }, modifier = Modifier.weight(1f).height(60.dp), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) { Text("VOLTAR") }
                    
                    Button(
                        onClick = {
                             isProcessing = true
                             scope.launch {
                                 var success = false
                                 if (isRefundVoucher) {
                                     ReceiptPrinter().printEntryTicket(
                                         "VOUCHER REEMBOLSO", 
                                         foundEntry!!.plate, 
                                         foundEntry!!.type, 
                                         "R$ %.2f".format(calculatedFee), 
                                         "DIRIGIR-SE À ADM", 
                                         "REFUND",
                                         foundEntry!!.photoPath
                                     )
                                     db.parkingDao().updateEntry(foundEntry!!.copy(
                                         isPaid = false,
                                         amount = 0.0,
                                         exitTime = System.currentTimeMillis(),
                                         isSynced = false,
                                         exitDeviceId = com.parking.stone.data.DeviceManager.deviceId
                                     ))
                                     success = true
                                 } else if (foundEntry!!.isPaid || calculatedFee == 0.0 || paymentMethod == "CASH") {
                                     success = true
                                 } else {
                                     success = StonePaymentProvider().processPayment(calculatedFee, when(paymentMethod){ "DEBIT" -> PaymentMethod.DEBIT; "PIX" -> PaymentMethod.PIX; else -> PaymentMethod.CREDIT }).success
                                 }
                                 
                                  if (success) {
                                     if (!isRefundVoucher) {
                                         val updated = foundEntry!!.copy(
                                             isPaid = true, 
                                             exitTime = System.currentTimeMillis(),
                                             paymentMethod = if(foundEntry!!.isPaid) foundEntry!!.paymentMethod else (if(calculatedFee == 0.0) "ISENTO" else paymentMethod),
                                             isSynced = false,
                                             exitDeviceId = com.parking.stone.data.DeviceManager.deviceId
                                         )
                                         db.parkingDao().updateEntry(updated)
                                         ReceiptPrinter().printEntryTicket("SAIDA", updated.plate, updated.type, "R$ %.2f".format(if(foundEntry!!.isPaid) foundEntry!!.amount else calculatedFee), updated.paymentMethod ?: "PAGO", "DONE", updated.photoPath)
                                     }
                                     
                                     launch(Dispatchers.IO) { com.parking.stone.data.XSync(db.parkingDao()).syncTickets(context) }
                                     foundEntry = null
                                     recentEntries = db.parkingDao().getActiveEntries(SessionManager.tenantId)
                                 }
                                 isProcessing = false
                             }
                        },
                        modifier = Modifier.weight(2f).height(60.dp),
                        enabled = !isProcessing,
                        colors = ButtonDefaults.buttonColors(containerColor = if (isRefundVoucher) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary, contentColor = Color.Black)
                    ) {
                        if (isProcessing) CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                        else Text(if (isRefundVoucher) "ESTORNAR" else if (foundEntry!!.isPaid) "CONFIRMAR SAÍDA" else "COBRAR")
                    }
                }
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Color.Gray)
        Text(value, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

