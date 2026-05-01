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

enum class EntryStep {
    PLATE, VEHICLE, PAYMENT, CONFIRM
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryScreen(navController: NavController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    val cameraExecutor = remember { java.util.concurrent.Executors.newSingleThreadExecutor() }

    // STEP STATE
    var currentStep by remember { mutableStateOf(EntryStep.PLATE) }
    
    // DATA STATE
    var detectedPlate by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf<String?>(null) } // null, "Carro", "Moto"
    var helmets by remember { mutableStateOf(0) }
    var paymentMethod by remember { mutableStateOf<String?>(null) } // null, "CREDIT", "DEBIT", "PIX", "CASH"
    
    // CAMERA & PROCESSING STATE
    var isProcessing by remember { mutableStateOf(false) }
    var imageCapture by remember { mutableStateOf<androidx.camera.core.ImageCapture?>(null) }
    var capturedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    var flashEnabled by remember { mutableStateOf(false) }
    var cameraActive by remember { mutableStateOf(true) }
    
    // BUSINESS LOGIC STATE
    var showDuplicateDialog by remember { mutableStateOf(false) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var showQrScanner by remember { mutableStateOf(false) }
    var accreditedUser by remember { mutableStateOf<AccreditedUser?>(null) }
    var showAccreditedDialog by remember { mutableStateOf(false) }

    // Sync & Init
    LaunchedEffect(Unit) {
        scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            com.parking.stone.data.XSync(com.parking.stone.data.AppDatabase.getDatabase(context).parkingDao()).syncConfig()
        }
    }

    // Duplicate Check
    LaunchedEffect(detectedPlate) {
        if (detectedPlate.length == 7) {
            val db = com.parking.stone.data.AppDatabase.getDatabase(context)
            val existing = db.parkingDao().getActiveEntryByPlate(detectedPlate, com.parking.stone.data.SessionManager.tenantId)
            if (existing != null) showDuplicateDialog = true
        }
    }

    // --- RENDER ---
    
    if (showQrScanner) {
        // ... (Keep existing QR Scanner logic but integrated)
        AccreditedScannerOverlay(
            onCancel = { showQrScanner = false },
            onUserDetected = { user ->
                accreditedUser = user
                showQrScanner = false
                showAccreditedDialog = true
            }
        )
        return
    }

    if (showAccreditedDialog && accreditedUser != null) {
        AccreditedEntryDialog(
            user = accreditedUser!!,
            onDismiss = { showAccreditedDialog = false; accreditedUser = null },
            onConfirm = { plate ->
                saveAccreditedEntry(context, scope, plate, accreditedUser!!, navController)
            }
        )
    }

    if (showDuplicateDialog) {
        DuplicateEntryDialog(
            plate = detectedPlate,
            onDismiss = { showDuplicateDialog = false },
            onExitRequested = {
                showDuplicateDialog = false
                navController.navigate(com.parking.stone.ui.Routes.EXIT + "?plate=$detectedPlate")
            }
        )
    }

    Column(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // 1. TOP SECTION: CAMERA / PREVIEW
        Box(modifier = Modifier.weight(if(currentStep == EntryStep.PLATE) 1.2f else 0.6f).fillMaxWidth()) {
            if (capturedBitmap == null) {
                CameraPreview(
                    flashEnabled = flashEnabled,
                    onPlateDetected = { /* Manual Capture only per user request */ },
                    onCaptureReady = { imageCapture = it }
                )
                // Frame Overlay
                Box(
                    modifier = Modifier
                        .size(320.dp, 120.dp)
                        .align(Alignment.Center)
                        .border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                )
            } else {
                androidx.compose.foundation.Image(
                    bitmap = capturedBitmap!!.asImageBitmap(),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
                // Retake Button
                IconButton(
                    onClick = { 
                        capturedBitmap = null
                        detectedPlate = ""
                        currentStep = EntryStep.PLATE
                        vehicleType = null
                        paymentMethod = null
                    },
                    modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Red.copy(alpha = 0.8f))
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, tint = Color.White)
                }
            }

            // Controls
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                IconButton(onClick = { navController.popBackStack() }, colors = IconButtonDefaults.iconButtonColors(containerColor = Color.Black.copy(alpha = 0.5f))) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = Color.White)
                }
                
                if (capturedBitmap == null) {
                    FloatingActionButton(
                        onClick = { showQrScanner = true },
                        containerColor = Color.White,
                        contentColor = Color.Black,
                        modifier = Modifier.size(48.dp)
                    ) { Icon(Icons.Default.QrCodeScanner, contentDescription = null) }
                }
            }

            if (capturedBitmap == null) {
                FloatingActionButton(
                    onClick = { flashEnabled = !flashEnabled },
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
                    containerColor = if(flashEnabled) MaterialTheme.colorScheme.primary else Color.Black.copy(alpha = 0.6f)
                ) { Icon(if(flashEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff, contentDescription = null) }
            }
        }

        // 2. BOTTOM SECTION: STEP-BY-STEP FORM
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(24.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // STEP 1: PLATE
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("PASSO 1: IDENTIFICAÇÃO", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = detectedPlate,
                        onValueChange = { 
                            val clean = it.uppercase().filter { c -> c.isLetterOrDigit() }
                            if (clean.length <= 7) detectedPlate = clean
                            if (clean.length == 7 && currentStep == EntryStep.PLATE) currentStep = EntryStep.VEHICLE
                        },
                        label = { Text("Placa do Veículo") },
                        modifier = Modifier.weight(1f),
                        textStyle = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 2.sp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = Color.DarkGray)
                    )
                    
                    if (capturedBitmap == null) {
                        Button(
                            onClick = { 
                                if (imageCapture != null && !isProcessing) {
                                    isProcessing = true
                                    processCapture(context, scope, imageExecutor = cameraExecutor, imageCapture!!, 
                                        onSuccess = { bitmap, plate ->
                                            capturedBitmap = bitmap
                                            detectedPlate = plate
                                            currentStep = EntryStep.VEHICLE
                                            isProcessing = false
                                        },
                                        onFailure = { isProcessing = false }
                                    )
                                }
                            },
                            modifier = Modifier.size(64.dp),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            if (isProcessing) CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                            else Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(32.dp))
                        }
                    } else {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.Green, modifier = Modifier.size(32.dp))
                    }
                }
            }

            // STEP 2: VEHICLE (Visible if Plate captured)
            if (detectedPlate.length >= 7) {
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("PASSO 2: TIPO DE VEÍCULO", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        WizardOptionButton(text = "CARRO", selected = vehicleType == "Carro", modifier = Modifier.weight(1f)) {
                            vehicleType = "Carro"
                            helmets = 0
                            currentStep = EntryStep.PAYMENT
                        }
                        WizardOptionButton(text = "MOTO", selected = vehicleType == "Moto", modifier = Modifier.weight(1f)) {
                            vehicleType = "Moto"
                            currentStep = EntryStep.VEHICLE // Keep here to select helmets
                        }
                    }
                    
                    if (vehicleType == "Moto") {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Quantidade de Capacetes", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            WizardOptionButton(text = "0", selected = helmets == 0, modifier = Modifier.weight(1f)) { helmets = 0; currentStep = EntryStep.PAYMENT }
                            WizardOptionButton(text = "1", selected = helmets == 1, modifier = Modifier.weight(1f)) { helmets = 1; currentStep = EntryStep.PAYMENT }
                            WizardOptionButton(text = "2", selected = helmets == 2, modifier = Modifier.weight(1f)) { helmets = 2; currentStep = EntryStep.PAYMENT }
                        }
                    }
                }
            }

            // STEP 3: PAYMENT (Visible if Vehicle selected)
            if (vehicleType != null && (vehicleType != "Moto" || currentStep != EntryStep.VEHICLE)) {
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("PASSO 3: PAGAMENTO", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    
                    val amount = com.parking.stone.data.PricingManager.calculateAtEntry(vehicleType!!)
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("VALOR PRÉ-PAGO:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                            Text("R$ ${String.format("%.2f", amount)}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black)
                        }
                    }
                    
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            WizardOptionButton(text = "CARTÃO CRÉDITO", selected = paymentMethod == "CREDIT", modifier = Modifier.weight(1f)) { paymentMethod = "CREDIT"; currentStep = EntryStep.CONFIRM }
                            WizardOptionButton(text = "CARTÃO DÉBITO", selected = paymentMethod == "DEBIT", modifier = Modifier.weight(1f)) { paymentMethod = "DEBIT"; currentStep = EntryStep.CONFIRM }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            WizardOptionButton(text = "PIX", selected = paymentMethod == "PIX", modifier = Modifier.weight(1f)) { paymentMethod = "PIX"; currentStep = EntryStep.CONFIRM }
                            WizardOptionButton(text = "DINHEIRO", selected = paymentMethod == "CASH", modifier = Modifier.weight(1f)) { paymentMethod = "CASH"; currentStep = EntryStep.CONFIRM }
                        }
                    }
                }
            }

            // STEP 4: CONFIRM (Visible if Payment selected)
            if (paymentMethod != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        if (!isProcessing) {
                            handleFinalization(context, scope, detectedPlate, vehicleType!!, helmets, paymentMethod!!, capturedBitmap, imageCapture, navController, 
                                onProcessing = { isProcessing = it },
                                onSuccess = { showSuccessDialog = true }
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(72.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.Black)
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(24.dp))
                    } else {
                        val label = if (paymentMethod == "CASH") "CONFIRMAR E IMPRIMIR" else "CHAMAR MAQUINA (R$)"
                        Text(label, fontSize = 18.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
            

            // Courtesy Button (Managers/Supervisors only)
            val userRole = com.parking.stone.data.SessionManager.currentUser?.role
            if (userRole == com.parking.stone.data.model.UserRole.MASTER || 
                userRole == com.parking.stone.data.model.UserRole.MANAGER || 
                userRole == com.parking.stone.data.model.UserRole.SUPERVISOR) {
                OutlinedButton(
                    onClick = {
                        if (detectedPlate.length >= 7 && !isProcessing) {
                            isProcessing = true
                            executeSave(context, scope, detectedPlate, vehicleType ?: "Carro", helmets, "CORTESIA", capturedBitmap, imageCapture, 
                                onSuccess = { showSuccessDialog = true },
                                onProcessing = { isProcessing = it }
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

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    if (showSuccessDialog) {
        SuccessEntryDialog {
            showSuccessDialog = false
            navController.popBackStack()
        }
    }
}

@Composable
fun WizardOptionButton(text: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            contentColor = if (selected) Color.Black else Color.White
        ),
        border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, Color.DarkGray)
    ) {
        Text(text, fontWeight = if (selected) FontWeight.Black else FontWeight.Bold, fontSize = 14.sp)
    }
}

// --- OPTIMIZED OCR & CAPTURE LOGIC ---

private fun processCapture(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    imageExecutor: java.util.concurrent.Executor,
    imageCapture: androidx.camera.core.ImageCapture,
    onSuccess: (android.graphics.Bitmap, String) -> Unit,
    onFailure: () -> Unit
) {
    imageCapture.takePicture(
        imageExecutor,
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
                image.close()

                // 1. SCALING FOR SPEED (Downscale to 1024px max)
                val scale = if (rotatedBitmap.width > 1024) 1024f / rotatedBitmap.width else 1.0f
                val ocrBitmap = android.graphics.Bitmap.createScaledBitmap(
                    rotatedBitmap, 
                    (rotatedBitmap.width * scale).toInt(), 
                    (rotatedBitmap.height * scale).toInt(), 
                    true
                )

                // 2. OCR WITH ML KIT v2
                scope.launch {
                    val visionImage = com.google.mlkit.vision.common.InputImage.fromBitmap(ocrBitmap, 0)
                    val recognizer = com.google.mlkit.vision.text.TextRecognition.getClient(com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS)
                    
                    recognizer.process(visionImage)
                        .addOnSuccessListener { visionText ->
                            // BRAZILIAN PLATE PATTERNS
                            val mercosulRegex = Regex("[A-Z]{3}[0-9][A-Z][0-9]{2}")
                            val oldRegex = Regex("[A-Z]{3}[0-9]{4}")
                            
                            var foundPlate = ""
                            visionText.textBlocks.forEach { block ->
                                block.lines.forEach { line ->
                                    val cleanText = line.text.uppercase().replace("-", "").replace(" ", "").trim()
                                    if (mercosulRegex.find(cleanText) != null || oldRegex.find(cleanText) != null) {
                                        foundPlate = cleanText.take(7)
                                    }
                                }
                            }
                            
                            onSuccess(rotatedBitmap, foundPlate)
                        }
                        .addOnFailureListener {
                            onSuccess(rotatedBitmap, "") // Return image even if OCR fails
                        }
                }
            }
            override fun onError(exc: androidx.camera.core.ImageCaptureException) {
                onFailure()
            }
        }
    )
}

private fun handleFinalization(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    plate: String,
    type: String,
    helmets: Int,
    method: String,
    bitmap: android.graphics.Bitmap?,
    imageCapture: androidx.camera.core.ImageCapture?,
    navController: NavController,
    onProcessing: (Boolean) -> Unit,
    onSuccess: () -> Unit
) {
    onProcessing(true)
    
    // 1. PAYMENT FLOW
    if (method == "CASH") {
        // Direct cash flow
        executeSave(context, scope, plate, type, helmets, method, bitmap, imageCapture, onSuccess, onProcessing)
    } else {
        // SIMULATE POS PAYMENT (CREDIT/DEBIT/PIX)
        scope.launch {
            kotlinx.coroutines.delay(2000) // Simulated processing time
            val isApproved = true // In real app, check Stone SDK result
            
            if (isApproved) {
                executeSave(context, scope, plate, type, helmets, method, bitmap, imageCapture, onSuccess, onProcessing)
            } else {
                android.widget.Toast.makeText(context, "Pagamento Recusado. Tente outro meio.", android.widget.Toast.LENGTH_LONG).show()
                onProcessing(false)
            }
        }
    }
}

private fun executeSave(
    context: android.content.Context,
    scope: kotlinx.coroutines.CoroutineScope,
    plate: String,
    type: String,
    helmets: Int,
    method: String,
    bitmap: android.graphics.Bitmap?,
    imageCapture: androidx.camera.core.ImageCapture?,
    onSuccess: () -> Unit,
    onProcessing: (Boolean) -> Unit
) {
    saveEntryWithPhoto(
        context = context,
        scope = scope,
        plate = plate,
        type = type,
        helmetsCount = helmets,
        amount = com.parking.stone.data.PricingManager.calculateAtEntry(type),
        isPaid = true,
        method = method,
        billing = "PREPAID",
        category = "ROTATIVO",
        imageCapture = imageCapture,
        bitmap = bitmap,
        onSuccess = { 
            onSuccess() 
            onProcessing(false)
        },
        onFinish = { onProcessing(false) }
    )
}



@Composable
fun AccreditedScannerOverlay(onCancel: () -> Unit, onUserDetected: (AccreditedUser) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var flashEnabled by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        CameraPreview(
            flashEnabled = flashEnabled,
            onPlateDetected = { token -> 
                if (token.length == 14 && token.all { it.isDigit() }) {
                    scope.launch {
                        val repo = AccreditedRepository()
                        val user = repo.validateQrCode(token, com.parking.stone.data.SessionManager.tenantId)
                        if (user != null) onUserDetected(user)
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
        }

        IconButton(onClick = onCancel, modifier = Modifier.align(Alignment.TopEnd).padding(16.dp)) {
            Icon(Icons.Default.Sync, contentDescription = null, tint = Color.White)
        }
    }
}

@Composable
fun AccreditedEntryDialog(user: AccreditedUser, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var plate by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Acesso Autorizado: ${user.category}") },
        text = {
            Column {
                Text("Portador: ${user.name}", fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = plate,
                    onValueChange = { plate = it.uppercase() },
                    label = { Text("Placa do Veículo") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(plate) }, enabled = plate.length >= 7) { Text("Emitir Ticket Gratuito") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
fun DuplicateEntryDialog(plate: String, onDismiss: () -> Unit, onExitRequested: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Veículo já está no pátio!") },
        text = { Text("A placa $plate já possui um ticket aberto. Deseja realizar a SAÍDA agora?") },
        confirmButton = {
            Button(onClick = onExitRequested) { Text("Ir para Saída") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Continuar Entrada") }
        }
    )
}

@Composable
fun SuccessEntryDialog(onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = { },
        icon = { Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.Green, modifier = Modifier.size(64.dp)) },
        title = { Text("Entrada Registrada!") },
        text = { Text("O ticket foi emitido e os dados estão sendo sincronizados.") },
        confirmButton = {
            Button(onClick = onConfirm) { Text("OK") }
        }
    )
}

private fun saveAccreditedEntry(context: android.content.Context, scope: kotlinx.coroutines.CoroutineScope, plate: String, user: AccreditedUser, navController: NavController) {
    scope.launch {
        val db = com.parking.stone.data.AppDatabase.getDatabase(context)
        val entry = com.parking.stone.data.model.ParkingEntry(
            plate = plate,
            type = "Credenciado",
            entryTime = System.currentTimeMillis(),
            isPaid = true,
            amount = 0.0,
            paymentMethod = "ISENTO",
            transactionId = "ACC-${user.token}",
            operatorName = com.parking.stone.data.SessionManager.currentUser?.name ?: "Auto",
            operatorId = com.parking.stone.data.SessionManager.currentUser?.id,
            billingMode = "PREPAID",
            category = "CREDENCIADO",
            accreditedId = user.id,
            photoPath = null,
            tenantId = com.parking.stone.data.SessionManager.tenantId,
            deviceId = com.parking.stone.data.DeviceManager.deviceId
        )
        db.parkingDao().insertEntry(entry)
        val printer = com.parking.stone.hardware.ReceiptPrinter()
        printer.printEntryTicket("ISENTO - ${user.category}", entry.plate, entry.type, "R$ 0,00", "CREDENTIAL", user.name)
        navController.popBackStack()
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
        scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val out = java.io.FileOutputStream(photoFile)
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, out)
                out.flush()
                out.close()
                saveAndPrint(photoFile.absolutePath)
            } catch(e: Exception) {
                saveAndPrint(null)
            }
        }
    } else if (imageCapture != null) {
        val outputOptions = androidx.camera.core.ImageCapture.OutputFileOptions.Builder(photoFile).build()
        imageCapture.takePicture(
            outputOptions,
            androidx.core.content.ContextCompat.getMainExecutor(context),
            object : androidx.camera.core.ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: androidx.camera.core.ImageCapture.OutputFileResults) {
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
