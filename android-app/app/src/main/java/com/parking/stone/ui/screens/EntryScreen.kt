package com.parking.stone.ui.screens

import android.Manifest
import android.util.Log
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.compose.material.icons.filled.ArrowBack
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import com.parking.stone.hardware.TextAnalyzer
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors
import com.parking.stone.data.AccreditedRepository
import com.parking.stone.data.AccreditedUser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryScreen(navController: NavController) {
    // STATE
    var detectedPlate by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf("Carro") } // Carro, Moto
    var helmets by remember { mutableStateOf("0") }
    var paymentMethod by remember { mutableStateOf("CREDIT") }
    var isProcessing by remember { mutableStateOf(false) }
    var imageCapture by remember { mutableStateOf<androidx.camera.core.ImageCapture?>(null) }
    var capturedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    
    // Plate Input State
    var isLegacyPlate by remember { mutableStateOf(false) } // Mercosul (Default) vs Legacy
    
    // Battery & Hardware Stats
    var flashEnabled by remember { mutableStateOf(false) }
    var cameraActive by remember { mutableStateOf(true) }
    var lastInteraction by remember { mutableLongStateOf(System.currentTimeMillis()) }
    
    // Inactivity Timeout (1 minute)
    LaunchedEffect(lastInteraction) {
        kotlinx.coroutines.delay(60000)
        cameraActive = false
    }

    // Reset interaction on any meaningful state change
    fun resetInactivity() {
        lastInteraction = System.currentTimeMillis()
        cameraActive = true
    }
    
    // Accredited Flow State
    var showQrScanner by remember { mutableStateOf(false) }
    var accreditedUser by remember { mutableStateOf<AccreditedUser?>(null) }
    var showAccreditedDialog by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState() // Scrollable Form
    
    // Sync Config on Load
    LaunchedEffect(Unit) {
        scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            com.parking.stone.data.XSync(com.parking.stone.data.AppDatabase.getDatabase(context).parkingDao()).syncConfig()
        }
    }

    var showDuplicateDialog by remember { mutableStateOf(false) }
    var existingTicketId by remember { mutableStateOf<Long?>(null) }
    
    // Performance Tracking
    var processStartTime by remember { mutableLongStateOf(0L) }
    
    // Auto-detect Plate Pattern
    LaunchedEffect(detectedPlate) {
        if (detectedPlate.length >= 5) {
            val char4 = detectedPlate[4]
            if (char4.isDigit()) isLegacyPlate = true
            else if (char4.isLetter()) isLegacyPlate = false
        }
    }

    LaunchedEffect(detectedPlate) {
        if (detectedPlate.length == 7) {
            val db = com.parking.stone.data.AppDatabase.getDatabase(context)
            val existing = db.parkingDao().getActiveEntryByPlate(detectedPlate, com.parking.stone.data.SessionManager.tenantId)
            if (existing != null) {
                existingTicketId = existing.id
                showDuplicateDialog = true
            }
        }
    }

    if (showDuplicateDialog) {
        AlertDialog(
            onDismissRequest = { showDuplicateDialog = false },
            title = { Text("Veículo já está no pátio!") },
            text = { Text("A placa $detectedPlate já possui um ticket aberto. Deseja realizar a SAÍDA deste veículo agora?") },
            confirmButton = {
                Button(onClick = { 
                    showDuplicateDialog = false
                    navController.navigate(com.parking.stone.ui.Routes.EXIT + "?plate=$detectedPlate")
                }) { Text("Ir para Saída") }
            },
            dismissButton = {
                TextButton(onClick = { showDuplicateDialog = false }) { Text("Continuar Entrada") }
            }
        )
    }

    // --- PERSONA QR SCANNER OVERLAY ---
    if (showQrScanner) {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
              CameraPreview(
                flashEnabled = flashEnabled,
                onPlateDetected = { token -> 
                    // Se for uma sequência numérica de 14 dígitos, tenta validar
                    if (token.length == 14 && token.all { it.isDigit() }) {
                        scope.launch {
                            val repo = AccreditedRepository()
                            val user = repo.validateQrCode(token, com.parking.stone.data.SessionManager.tenantId)
                            if (user != null) {
                                accreditedUser = user
                                showQrScanner = false
                                showAccreditedDialog = true
                            } else {
                                android.widget.Toast.makeText(context, "Credencial Inválida ou Inativa", android.widget.Toast.LENGTH_LONG).show()
                                showQrScanner = false
                            }
                        }
                    }
                },
                onCaptureReady = {}
            )
             Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(modifier = Modifier.size(250.dp).border(4.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(16.dp)))
                Spacer(modifier = Modifier.height(16.dp))
                Text("Escaneie o QR Code da Persona", color = Color.White, fontWeight = FontWeight.Bold)
                
                Button(
                    onClick = {
                        scope.launch {
                            // Simular leitura de um token real cadastrado
                            val tokenSimulado = "00000000000000" 
                            val repo = AccreditedRepository()
                            val user = repo.validateQrCode(tokenSimulado, com.parking.stone.data.SessionManager.tenantId)
                            if (user != null) {
                                accreditedUser = user
                                showQrScanner = false
                                showAccreditedDialog = true
                            } else {
                                android.widget.Toast.makeText(context, "Credencial Inválida", android.widget.Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    modifier = Modifier.padding(top=32.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black)
                ) {
                    Text("[DEBUG] Simular Leitura 14 Dígitos")
                }
            }
            IconButton(
                onClick = { showQrScanner = false },
                modifier = Modifier.align(Alignment.TopEnd).padding(16.dp)
            ) {
                Text("X", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    // --- ACCREDITED PLATE ENTRY DIALOG ---
    if (showAccreditedDialog && accreditedUser != null) {
        var plateForAccredited by remember { mutableStateOf("") }
        
        AlertDialog(
            onDismissRequest = { showAccreditedDialog = false; accreditedUser = null },
            title = { Text("Acesso Autorizado: ${accreditedUser!!.category}") },
            text = {
                Column {
                    Text("Portador: ${accreditedUser!!.name}", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Informe a Placa do Veículo:")
                    OutlinedTextField(
                        value = plateForAccredited,
                        onValueChange = { plateForAccredited = it.uppercase() },
                        placeholder = { Text("ABC1D23") },
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (plateForAccredited.length >= 7) {
                            scope.launch {
                                val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                                val entry = com.parking.stone.data.model.ParkingEntry(
                                    plate = plateForAccredited,
                                    type = "Credenciado",
                                    entryTime = System.currentTimeMillis(),
                                    isPaid = true,
                                    amount = 0.0,
                                    paymentMethod = "ISENTO",
                                    transactionId = "ACC-${accreditedUser!!.token}",
                                    operatorName = com.parking.stone.data.SessionManager.currentUser?.name ?: "Auto",
                                    operatorId = com.parking.stone.data.SessionManager.currentUser?.id,
                                    billingMode = "PREPAID",
                                    category = "CREDENCIADO",
                                    accreditedId = accreditedUser!!.id,
                                    photoPath = null,
                                    tenantId = com.parking.stone.data.SessionManager.tenantId,
                                    deviceId = com.parking.stone.data.DeviceManager.deviceId
                                )
                                db.parkingDao().insertEntry(entry)
                                
                                val printer = com.parking.stone.hardware.ReceiptPrinter()
                                printer.printEntryTicket("ISENTO - ${accreditedUser!!.category}", entry.plate, entry.type, "R$ 0,00", "CREDENTIAL", accreditedUser!!.name)

                                showAccreditedDialog = false
                                accreditedUser = null
                                navController.popBackStack()
                            }
                        }
                    },
                    enabled = plateForAccredited.length >= 7
                ) { Text("Emitir Ticket Gratuito") }
            },
            dismissButton = {
                TextButton(onClick = { showAccreditedDialog = false }) { Text("Cancelar") }
            }
        )
    }

    // --- MAIN ENTRY SCREEN ---
    val containerShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    
    Column(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // Camera Preview Section (Fixed Height)
        Box(modifier = Modifier.weight(0.8f).fillMaxWidth()) {
            if (cameraActive && capturedBitmap == null) {
                CameraPreview(
                    flashEnabled = flashEnabled,
                    onPlateDetected = { /* Real-time disabled as requested */ },
                    onCaptureReady = { capture -> imageCapture = capture }
                )
            } else if (capturedBitmap != null) {
                androidx.compose.foundation.Image(
                    bitmap = capturedBitmap!!.asImageBitmap(),
                    contentDescription = "Captured Plate",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
                // Retake button
                IconButton(
                    onClick = { capturedBitmap = null; resetInactivity() },
                    modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Red.copy(alpha = 0.8f))
                ) {
                    Icon(Icons.Default.Sync, contentDescription = "Refazer", tint = Color.White)
                }
            } else {
                Box(modifier = Modifier.fillMaxSize().background(Color.DarkGray), contentAlignment = Alignment.Center) {
                    Button(onClick = { resetInactivity() }) {
                        Icon(Icons.Default.Sync, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Reativar Câmera (Economia)")
                    }
                }
            }
            
            // Overlays
            if (capturedBitmap == null) {
                Box(
                    modifier = Modifier
                        .size(300.dp, 100.dp)
                        .align(Alignment.Center)
                        .border(2.dp, if(cameraActive) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f) else Color.Gray, RoundedCornerShape(12.dp))
                )
            }

            // Flash Toggle
            if (capturedBitmap == null) {
                FloatingActionButton(
                    onClick = { flashEnabled = !flashEnabled; resetInactivity() },
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
                    containerColor = if (flashEnabled) MaterialTheme.colorScheme.primary else Color.Black.copy(alpha = 0.6f),
                    contentColor = if (flashEnabled) Color.Black else Color.White
                ) {
                    Icon(if(flashEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff, contentDescription = "Flash")
                }
            }
            
            IconButton(
                onClick = { navController.popBackStack() },
                modifier = Modifier.align(Alignment.TopStart).padding(16.dp),
                colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Black.copy(alpha = 0.5f))
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = Color.White)
            }

            FloatingActionButton(
                onClick = { showQrScanner = true },
                modifier = Modifier.align(Alignment.TopEnd).padding(16.dp),
                containerColor = Color.White,
                contentColor = Color.Black
            ) {
                Icon(Icons.Default.QrCodeScanner, contentDescription = "Credenciado")
            }
        }

        // Form Section (Scrollable)
        Column(
            modifier = Modifier
                .weight(1.2f) // Give more space to form
                .fillMaxWidth()
                .clip(containerShape)
                .background(MaterialTheme.colorScheme.surface)
                .padding(24.dp)
                .verticalScroll(scrollState), // ENABLE SCROLL
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Entrada", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                
                // Plate Mode Toggle
                TextButton(onClick = { isLegacyPlate = !isLegacyPlate }) {
                    Text(if(isLegacyPlate) "Padrão Antigo" else "Mercosul", color = MaterialTheme.colorScheme.primary)
                }
            }
            
            // Plate Input Row with Camera Button
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = detectedPlate,
                    onValueChange = { 
                         resetInactivity()
                         val clean = it.filter { c -> c.isLetterOrDigit() }.uppercase()
                         if (clean.length <= 7) detectedPlate = clean
                    },
                    label = { Text(if(isLegacyPlate) "Placa (AAA-9999)" else "Placa (ABC1D23)") },
                    modifier = Modifier.weight(1f),
                    visualTransformation = if (isLegacyPlate && detectedPlate.length > 3) {
                        androidx.compose.ui.text.input.VisualTransformation { text ->
                            val out = text.text.substring(0, 3) + "-" + text.text.substring(3)
                            val offsetMapping = object : androidx.compose.ui.text.input.OffsetMapping {
                                override fun originalToTransformed(offset: Int): Int = if (offset <= 3) offset else offset + 1
                                override fun transformedToOriginal(offset: Int): Int = if (offset <= 3) offset else offset - 1
                            }
                            androidx.compose.ui.text.input.TransformedText(androidx.compose.ui.text.AnnotatedString(out), offsetMapping)
                        }
                    } else androidx.compose.ui.text.input.VisualTransformation.None,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = Color.Gray,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    singleLine = true
                )
                
                // Photo Capture Button (Icon only)
                IconButton(
                    onClick = { 
                         if (imageCapture != null && !isProcessing) {
                             isProcessing = true
                             imageCapture!!.takePicture(
                                 Executors.newSingleThreadExecutor(),
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
                                         
                                         // Optimize for OCR: Scale down before processing
                                         val scale = 0.5f
                                         val ocrBitmap = android.graphics.Bitmap.createScaledBitmap(
                                             rotatedBitmap, 
                                             (rotatedBitmap.width * scale).toInt(), 
                                             (rotatedBitmap.height * scale).toInt(), 
                                             false
                                         )
                                         
                                         capturedBitmap = rotatedBitmap
                                         image.close()

                                         // OCR on the static image
                                         scope.launch {
                                             val visionImage = com.google.mlkit.vision.common.InputImage.fromBitmap(ocrBitmap, 0)
                                             val recognizer = com.google.mlkit.vision.text.TextRecognition.getClient(com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS)
                                             recognizer.process(visionImage)
                                                 .addOnSuccessListener { visionText ->
                                                     val platePattern = Regex("[A-Z]{3}[0-9][A-Z0-9][0-9]{2}")
                                                     val oldPattern = Regex("[A-Z]{3}[0-9]{4}")
                                                     
                                                     visionText.textBlocks.forEach { block ->
                                                         block.lines.forEach { line ->
                                                             val text = line.text.uppercase().replace("-", "").replace(" ", "")
                                                             if (platePattern.find(text) != null || oldPattern.find(text) != null) {
                                                                 detectedPlate = text.take(7)
                                                             }
                                                         }
                                                     }
                                                     isProcessing = false
                                                 }
                                                 .addOnFailureListener { isProcessing = false }
                                         }
                                     }
                                     override fun onError(exc: androidx.camera.core.ImageCaptureException) {
                                         isProcessing = false
                                     }
                                 }
                             )
                         }
                    },
                    modifier = Modifier.size(56.dp).background(if(capturedBitmap != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = "Capturar Foto", tint = if(capturedBitmap != null) Color.Black else Color.White)
                }
            }

            // Vehicle Selector
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                VehicleTypeButton(text = "Carro", selected = vehicleType == "Carro", modifier = Modifier.weight(1f)) { vehicleType = "Carro" }
                VehicleTypeButton(text = "Moto", selected = vehicleType == "Moto", modifier = Modifier.weight(1f)) { vehicleType = "Moto" }
            }

            if (vehicleType == "Moto") {
                Text("Capacetes", color=Color.Gray, style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    VehicleTypeButton(text="1", selected = helmets == "1", modifier = Modifier.weight(1f)) { helmets = "1" }
                    VehicleTypeButton(text="2", selected = helmets == "2", modifier = Modifier.weight(1f)) { helmets = "2" }
                }
            }

            // Payment Method (PrePaid)
            val isPrePaid = com.parking.stone.data.ConfigManager.paymentTiming == com.parking.stone.data.ConfigManager.PaymentTiming.ENTRY
            if (isPrePaid) {
                  val displayAmount = com.parking.stone.data.PricingManager.calculateAtEntry(vehicleType)
                  
                  Card(
                      colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                      modifier = Modifier.fillMaxWidth()
                  ) {
                      Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                          Text("VALOR A PAGAR", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                          Text("R$ ${String.format("%.2f", displayAmount)}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                      }
                  }

                  Text("Meio de Pagamento", style = MaterialTheme.typography.titleMedium, color = Color.White)
                  Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val methods = listOf("CREDIT" to "Crédito", "DEBIT" to "Débito", "PIX" to "Pix", "CASH" to "Dinheiro")
                    methods.forEach { (methodKey, label) ->
                        FilterChip(
                            selected = paymentMethod == methodKey,
                            onClick = { paymentMethod = methodKey },
                            label = { Text(label) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = Color.Black)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            var showSuccessDialog by remember { mutableStateOf(false) }
            if (showSuccessDialog) {
                AlertDialog(
                    onDismissRequest = { },
                    icon = { Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.Green, modifier = Modifier.size(64.dp)) },
                    title = { Text("Entrada Registrada!") },
                    text = { Text("O ticket foi emitido e os dados estão sendo sincronizados.") },
                    confirmButton = {
                        Button(onClick = { 
                            showSuccessDialog = false
                            navController.popBackStack() 
                        }) { Text("OK") }
                    }
                )
            }

            // Confirm Button
            Button(
                onClick = { 
                    if (com.parking.stone.data.ConfigManager.requireEntryPhoto && capturedBitmap == null) {
                        android.widget.Toast.makeText(context, "FOTO OBRIGATÓRIA PELO PORTAL", android.widget.Toast.LENGTH_LONG).show()
                        return@Button
                    }
                    if (detectedPlate.isNotEmpty() && !isProcessing) {
                        isProcessing = true
                        processStartTime = System.currentTimeMillis()
                        val currentAmount = if (isPrePaid) com.parking.stone.data.PricingManager.calculateAtEntry(vehicleType) else 0.0
                        saveEntryWithPhoto(
                            context = context,
                            scope = scope,
                            plate = detectedPlate,
                            type = vehicleType,
                            helmetsCount = if (vehicleType == "Moto") helmets.toIntOrNull() ?: 0 else 0,
                            amount = currentAmount,
                            isPaid = isPrePaid,
                            method = if (isPrePaid) paymentMethod else null,
                            billing = if (isPrePaid) "PREPAID" else "POSTPAID",
                            category = "ROTATIVO",
                            imageCapture = imageCapture,
                            bitmap = capturedBitmap,
                            onSuccess = { 
                                val totalTime = (System.currentTimeMillis() - processStartTime).toInt()
                                com.parking.stone.data.TelemetryManager.logEvent(
                                    context = context,
                                    eventType = "ENTRY_TOTAL",
                                    totalProcessTime = totalTime
                                )
                                showSuccessDialog = true 
                            },
                            onFinish = { isProcessing = false }
                        )
                    }
                },
                enabled = !isProcessing && detectedPlate.length >= 7,
                modifier = Modifier.fillMaxWidth().height(60.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.Black)
            ) {
                if (isProcessing) CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                else Text("CONFIRMAR ENTRADA", fontWeight = FontWeight.Bold)
            }

            // Courtesy Button (Managers/Supervisors only)
            val userRole = com.parking.stone.data.SessionManager.currentUser?.role
            if (userRole == com.parking.stone.data.model.UserRole.MANAGER || 
                userRole == com.parking.stone.data.model.UserRole.SUPERVISOR ||
                userRole == com.parking.stone.data.model.UserRole.MASTER) {
                
                OutlinedButton(
                    onClick = {
                        if (detectedPlate.length >= 7 && !isProcessing) {
                            isProcessing = true
                            saveEntryWithPhoto(
                                context = context,
                                scope = scope,
                                plate = detectedPlate,
                                type = vehicleType,
                                helmetsCount = if (vehicleType == "Moto") helmets.toIntOrNull() ?: 0 else 0,
                                amount = 0.0,
                                isPaid = true, // Courtesy is considered paid/cleared
                                method = "CORTESIA",
                                billing = "PREPAID",
                                category = "CORTESIA",
                                imageCapture = imageCapture,
                                bitmap = capturedBitmap,
                                onSuccess = { showSuccessDialog = true },
                                onFinish = { isProcessing = false }
                            )
                        }
                    },
                    enabled = !isProcessing && detectedPlate.length >= 7,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.Gray)
                ) {
                    Text("EMITIR CORTESIA", color = Color.Gray, fontWeight = FontWeight.Bold)
                }
            }
            
            // Extra spacing for scroll
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun VehicleTypeButton(text: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.height(50.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else Color.Transparent,
            contentColor = if (selected) MaterialTheme.colorScheme.primary else Color.Gray
        ),
        border = if (selected) androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary) 
                 else androidx.compose.foundation.BorderStroke(1.dp, Color.Gray)
    ) { 
        Text(text, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) 
    }
}



private fun saveEntryWithPhoto(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    plate: String,
    type: String,
    helmetsCount: Int,
    amount: Double,
    isPaid: Boolean,
    method: String?,
    billing: String,
    category: String,
    imageCapture: androidx.camera.core.ImageCapture?,
    bitmap: android.graphics.Bitmap?,
    onSuccess: () -> Unit,
    onFinish: () -> Unit
) {
    val photoFile = java.io.File(context.filesDir, "plate_${System.currentTimeMillis()}.jpg")
    
    val saveAndPrint = { finalPhotoPath: String? ->
        scope.launch {
            try {
                val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                val entry = com.parking.stone.data.model.ParkingEntry(
                    plate = plate,
                    type = type,
                    helmets = helmetsCount,
                    entryTime = System.currentTimeMillis(),
                    isPaid = isPaid,
                    amount = amount,
                    paymentMethod = method,
                    transactionId = if (isPaid) "TX-${System.currentTimeMillis()}" else null,
                    operatorName = com.parking.stone.data.SessionManager.currentUser?.name ?: "Desconhecido",
                    operatorId = com.parking.stone.data.SessionManager.currentUser?.id,
                    billingMode = billing,
                    category = category,
                    photoPath = finalPhotoPath,
                    tenantId = com.parking.stone.data.SessionManager.tenantId,
                    deviceId = com.parking.stone.data.DeviceManager.deviceId
                )
                val newId = db.parkingDao().insertEntry(entry)
                val printer = com.parking.stone.hardware.ReceiptPrinter()
                
                val displayMethod = if (method == "CORTESIA") "CORTESIA" else (if(isPaid) "PAGO" else "A PAGAR")
                printer.printEntryTicket(
                    if(category == "CORTESIA") "CORTESIA" else "ESTACIONAMENTO", 
                    entry.plate, 
                    entry.type, 
                    "R$ ${String.format("%.2f", amount)}", 
                    displayMethod, 
                    newId.toString(), 
                    finalPhotoPath, 
                    entry.helmets
                )
                
                // Trigger Sync
                scope.launch(kotlinx.coroutines.Dispatchers.IO) {
                    try {
                        val repo = com.parking.stone.data.XSync(db.parkingDao())
                        repo.syncTickets(context)
                        repo.syncSessions()
                    } catch(e: Exception) { }
                }
                
                onSuccess()
            } catch(e: Exception) {
                android.widget.Toast.makeText(context, "Erro: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
            }
            onFinish()
        }
    }

    if (bitmap != null) {
        val captureStartTime = System.currentTimeMillis()
        scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val out = java.io.FileOutputStream(photoFile)
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, out)
                out.flush()
                out.close()
                val captureTime = (System.currentTimeMillis() - captureStartTime).toInt()
                com.parking.stone.data.TelemetryManager.logEvent(
                    context = context,
                    eventType = "CAPTURE",
                    captureTime = captureTime
                )
                saveAndPrint(photoFile.absolutePath)
            } catch(e: Exception) {
                saveAndPrint(null)
            }
        }
    } else if (imageCapture != null) {
        val captureStartTime = System.currentTimeMillis()
        val outputOptions = androidx.camera.core.ImageCapture.OutputFileOptions.Builder(photoFile).build()
        imageCapture.takePicture(
            outputOptions,
            androidx.core.content.ContextCompat.getMainExecutor(context),
            object : androidx.camera.core.ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: androidx.camera.core.ImageCapture.OutputFileResults) {
                    val captureTime = (System.currentTimeMillis() - captureStartTime).toInt()
                    com.parking.stone.data.TelemetryManager.logEvent(
                        context = context,
                        eventType = "CAPTURE",
                        captureTime = captureTime
                    )
                    saveAndPrint(photoFile.absolutePath)
                }
                override fun onError(exc: androidx.camera.core.ImageCaptureException) {
                    saveAndPrint(null)
                }
            }
        )
    } else {
        saveAndPrint(null)
    }
}
