package com.parking.stone.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.Sync
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
    var exitPhotoCaptured by remember { mutableStateOf(false) }
    
    // Performance Tracking
    var processStartTime by remember { mutableLongStateOf(0L) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = AppDatabase.getDatabase(context)
    
    // Battery & Hardware Stats
    var flashEnabled by remember { mutableStateOf(false) }
    var cameraActive by remember { mutableStateOf(true) }
    var lastInteraction by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    
    // Inactivity Timeout (1 minute)
    LaunchedEffect(lastInteraction) {
        kotlinx.coroutines.delay(60000)
        cameraActive = false
    }

    fun resetInactivity() {
        lastInteraction = System.currentTimeMillis()
        cameraActive = true
    }

    val cameraExecutor = remember { java.util.concurrent.Executors.newSingleThreadExecutor() }
    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    // Recent Entries List
    var recentEntries by remember { mutableStateOf<List<ParkingEntry>>(emptyList()) }

    fun processManualResult(plate: String) {
        resetInactivity()
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
                    val calculation = com.parking.stone.data.PricingManager.calculate(entry, now)
                    calculatedFee = calculation.first
                    isRefundVoucher = calculation.second
                    durationString = calculation.third
                    foundEntry = entry
                }
                isProcessing = false
            }
        } else {
            isProcessing = false
        }
    }

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
                if (cameraActive) {
                    CameraPreview(
                        flashEnabled = flashEnabled,
                        onPlateDetected = { result -> 
                            resetInactivity()
                            // Point-and-read only for Numeric IDs (QR Tickets) to avoid OCR errors on plates
                            if (result.isNotEmpty() && result.all { it.isDigit() }) {
                                if (!isProcessing && foundEntry == null) {
                                    processManualResult(result)
                                }
                            }
                        },
                        onCaptureReady = { capture -> imageCapture = capture }
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize().background(Color.DarkGray), contentAlignment = Alignment.Center) {
                        Button(onClick = { resetInactivity() }) {
                            Icon(Icons.Default.Sync, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Reativar Câmera")
                        }
                    }
                }
                
                // Manual Capture Button
                if (cameraActive && imageCapture != null) {
                    IconButton(
                        onClick = {
                            resetInactivity()
                            isProcessing = true
                            imageCapture!!.takePicture(
                                cameraExecutor,
                                object : androidx.camera.core.ImageCapture.OnImageCapturedCallback() {
                                    override fun onCaptureSuccess(image: androidx.camera.core.ImageProxy) {
                                        val buffer = image.planes[0].buffer
                                        val bytes = ByteArray(buffer.remaining())
                                        buffer.get(bytes)
                                        val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                        
                                        // Fix rotation
                                        val matrix = android.graphics.Matrix()
                                        matrix.postRotate(image.imageInfo.rotationDegrees.toFloat())
                                        val rotatedBitmap = android.graphics.Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                                        
                                        // ROI and Scaling
                                        val originalWidth = rotatedBitmap.width
                                        val originalHeight = rotatedBitmap.height
                                        val cropWidth = (originalWidth * 0.8).toInt()
                                        val cropHeight = (originalHeight * 0.4).toInt()
                                        val cropX = (originalWidth - cropWidth) / 2
                                        val cropY = (originalHeight - cropHeight) / 2
                                        val croppedBitmap = android.graphics.Bitmap.createBitmap(rotatedBitmap, cropX, cropY, cropWidth, cropHeight)
                                        val scale = 0.6f
                                        val ocrBitmap = android.graphics.Bitmap.createScaledBitmap(croppedBitmap, (cropWidth * scale).toInt(), (cropHeight * scale).toInt(), false)
                                        
                                        image.close()

                                        scope.launch {
                                            val visionImage = com.google.mlkit.vision.common.InputImage.fromBitmap(ocrBitmap, 0)
                                            val recognizer = com.google.mlkit.vision.text.TextRecognition.getClient(com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS)
                                            val barcodeScanner = com.google.mlkit.vision.barcode.BarcodeScanning.getClient()

                                            // Try Barcode first
                                            barcodeScanner.process(visionImage)
                                                .addOnSuccessListener { barcodes ->
                                                    if (barcodes.isNotEmpty()) {
                                                        val plate = barcodes[0].rawValue ?: ""
                                                        processManualResult(plate)
                                                    } else {
                                                        // Fallback to OCR
                                                        recognizer.process(visionImage)
                                                            .addOnSuccessListener { visionText ->
                                                                val platePattern = Regex("[A-Z]{3}[0-9][A-Z0-9][0-9]{2}")
                                                                val oldPattern = Regex("[A-Z]{3}[0-9]{4}")
                                                                var found = false
                                                                visionText.textBlocks.forEach { block ->
                                                                    block.lines.forEach { line ->
                                                                        val text = line.text.uppercase().replace("-", "").replace(" ", "")
                                                                        if (platePattern.find(text) != null || oldPattern.find(text) != null) {
                                                                            processManualResult(text.take(7))
                                                                            found = true
                                                                        }
                                                                    }
                                                                }
                                                                if (!found) isProcessing = false
                                                            }
                                                            .addOnFailureListener { isProcessing = false }
                                                    }
                                                }
                                                .addOnFailureListener { isProcessing = false }
                                        }
                                    }
                                    override fun onError(exc: androidx.camera.core.ImageCaptureException) {
                                        isProcessing = false
                                    }
                                }
                            )
                        },
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 80.dp)
                            .size(64.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                        } else {
                            Icon(Icons.Default.CameraAlt, contentDescription = "Capturar", tint = Color.Black)
                        }
                    }
                }

                // Flash Toggle
                FloatingActionButton(
                    onClick = { flashEnabled = !flashEnabled; resetInactivity() },
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
                    containerColor = if (flashEnabled) MaterialTheme.colorScheme.primary else Color.Black.copy(alpha = 0.6f),
                    contentColor = if (flashEnabled) Color.Black else Color.White
                ) {
                    Icon(if(flashEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff, contentDescription = "Flash")
                }
                Box(
                    modifier = Modifier
                        .size(280.dp)
                        .align(Alignment.Center)
                        .border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp))
                ) {
                    Box(modifier = Modifier.fillMaxWidth().height(2.dp).background(Color.Red).align(Alignment.Center))
                }
                Text(
                    "Aponte e capture o QR ou Placa", 
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
                                        foundEntry = entry
                                        val now = System.currentTimeMillis()
                                        val calculation = com.parking.stone.data.PricingManager.calculate(entry, now)
                                        calculatedFee = if (entry.isPaid) 0.0 else calculation.first
                                        isRefundVoucher = calculation.second
                                        durationString = calculation.third
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
                            onClick = { 
                                scope.launch {
                                    val entry = db.parkingDao().getActiveEntryByPlate(item.plate, SessionManager.tenantId)
                                    if (entry != null) {
                                        val calculation = com.parking.stone.data.PricingManager.calculate(entry)
                                        calculatedFee = if (entry.isPaid) 0.0 else calculation.first
                                        isRefundVoucher = calculation.second
                                        durationString = calculation.third
                                        foundEntry = entry
                                    }
                                }
                            },
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
                }

                if (com.parking.stone.data.ConfigManager.requireExitPhoto) {
                    Text("Foto de Saída (OBRIGATÓRIA)", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
                    Button(
                        onClick = { 
                            // In a real implementation, we would open a camera dialog here.
                            // For this demo, we'll simulate success.
                            exitPhotoCaptured = true
                            android.widget.Toast.makeText(context, "Foto de saída capturada!", android.widget.Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = if(exitPhotoCaptured) Color.Green else MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Default.CameraAlt, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if(exitPhotoCaptured) "FOTO REGISTRADA" else "CAPTURAR FOTO DE SAÍDA")
                    }
                    
                    if (!exitPhotoCaptured) {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.error.copy(alpha=0.1f)), modifier = Modifier.fillMaxWidth()) {
                             Text("Atenção: A foto de saída é obrigatória para este terminal.", modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
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
                             if (com.parking.stone.data.ConfigManager.requireExitPhoto && !exitPhotoCaptured) {
                                 android.widget.Toast.makeText(context, "FOTO DE SAÍDA OBRIGATÓRIA", android.widget.Toast.LENGTH_LONG).show()
                                 return@Button
                             }
                             isProcessing = true
                             processStartTime = System.currentTimeMillis()
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
                                     val totalTime = (System.currentTimeMillis() - processStartTime).toInt()
                                     com.parking.stone.data.TelemetryManager.logEvent(
                                         context = context,
                                         eventType = "EXIT_TOTAL",
                                         totalProcessTime = totalTime
                                     )
                                     if (!isRefundVoucher) {
                                         val updated = foundEntry!!.copy(
                                             isPaid = true, 
                                             exitTime = System.currentTimeMillis(),
                                             paymentMethod = if(foundEntry!!.isPaid) foundEntry!!.paymentMethod else (if(calculatedFee == 0.0) "ISENTO" else paymentMethod),
                                             isSynced = false,
                                             exitDeviceId = com.parking.stone.data.DeviceManager.deviceId
                                         )
                                         db.parkingDao().updateEntry(updated)
                                         if (com.parking.stone.data.ConfigManager.requireExitTicket) {
                                             ReceiptPrinter().printEntryTicket("SAIDA", updated.plate, updated.type, "R$ %.2f".format(if(foundEntry!!.isPaid) foundEntry!!.amount else calculatedFee), updated.paymentMethod ?: "PAGO", "DONE", updated.photoPath)
                                         }
                                     }
                                     
                                     launch(Dispatchers.IO) { com.parking.stone.data.XSync(db.parkingDao()).syncTickets(context) }
                                     recentEntries = db.parkingDao().getActiveEntries(SessionManager.tenantId)
                                     showSuccessDialog = true
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

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = { 
                showSuccessDialog = false
                foundEntry = null
            },
            title = { Text("Saída Registrada") },
            text = { Text("Veículo da placa ${foundEntry?.plate} liberado com sucesso!") },
            confirmButton = {
                Button(onClick = { 
                    showSuccessDialog = false
                    foundEntry = null
                }) { Text("OK") }
            }
        )
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Color.Gray)
        Text(value, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

