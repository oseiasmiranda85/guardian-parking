package com.parking.stone.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.parking.stone.data.AppDatabase
import com.parking.stone.data.model.CashSession
import com.parking.stone.data.model.UserRole
import com.parking.stone.data.SessionManager
import java.util.UUID
import kotlinx.coroutines.launch
import retrofit2.HttpException

@Composable
fun LoginScreen(navController: NavController) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()

    // Mock Users (Synced with Web)
    val mockUsers = mapOf(
        "oseias@live.it" to Pair("1234", com.parking.stone.data.model.UserRole.MASTER),
        "admin@stone.com.br" to Pair("1234", UserRole.MANAGER),
        "op1@stone.com.br" to Pair("1234", UserRole.OPERATOR),
        "sup@stone.com.br" to Pair("1234", UserRole.SUPERVISOR)
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo Section
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                painter = androidx.compose.ui.res.painterResource(id = com.parking.stone.R.drawable.logo_guardian),
                contentDescription = "Logo",
                modifier = Modifier.size(80.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "GUARDIAN",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp
            )
        }
        
        Spacer(modifier = Modifier.height(48.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Acesso ao Caixa",
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Usuário / Email") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = Color.Gray,
                        focusedLabelColor = MaterialTheme.colorScheme.primary,
                        cursorColor = MaterialTheme.colorScheme.primary
                    ),
                    singleLine = true
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Senha") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.NumberPassword,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = { focusManager.clearFocus() }
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = Color.Gray,
                        focusedLabelColor = MaterialTheme.colorScheme.primary,
                        cursorColor = MaterialTheme.colorScheme.primary
                    ),
                    singleLine = true
                )

                if (error != null) {
                    Text(text = error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Button(
                    onClick = {
                        isLoading = true
                        error = null
                        
                        scope.launch {
                            try {
                                // 1. Cloud Login
                                val response = com.parking.stone.data.NetworkModule.api.login(
                                    mapOf(
                                        "email" to username, 
                                        "password" to password,
                                        "deviceId" to com.parking.stone.data.DeviceManager.deviceId
                                    )
                                )
                                
                                // 2. Local Session Setup (Keep existing logic for offline continuity)
                                val db = AppDatabase.getDatabase(context)
                                val existingSession = db.cashDao().getCurrentOpenSession(response.tenant.id)
                                
                                if (existingSession != null && existingSession.userId != response.user.id) {
                                    isLoading = false
                                    error = "CAIXA PENDENTE: O operador ${existingSession.userName} ainda possui um caixa aberto neste terminal. Encerre o faturamento antes de trocar de usuário."
                                    return@launch
                                }

                                val sessionId = if (existingSession == null) {
                                    val newSession = CashSession(
                                        id = UUID.randomUUID().toString(),
                                        userId = response.user.id,
                                        userName = response.user.name,
                                        deviceId = com.parking.stone.data.DeviceManager.deviceId,
                                        startTime = System.currentTimeMillis(),
                                        startBalance = 0.0,
                                        status = "OPEN",
                                        tenantId = response.tenant.id
                                    )
                                    db.cashDao().insertSession(newSession)
                                    newSession.id
                                } else {
                                    existingSession.id
                                }
                                
                                // 3. Session Manager Update (With Cloud Token)
                                // Map string role to Enum
                                val roleEnum = try {
                                    UserRole.valueOf(response.user.role)
                                } catch (e: Exception) { UserRole.OPERATOR }

                                SessionManager.login(
                                    context = context,
                                    userId = response.user.id.toString(),
                                    email = username, 
                                    role = roleEnum, 
                                    sessionId = sessionId,
                                    token = response.token,
                                    tenant = response.tenant.id
                                )

                                // 3.5. Trigger Immediate Sync and WAIT
                                val repo = com.parking.stone.data.XSync(db.parkingDao())
                                try {
                                    repo.syncConfig()   // Get latest Pricing (Pre/Post)
                                    repo.syncSessions() // Send Open Caixa to Web
                                    repo.syncDevice()   // Register this terminal as ONLINE
                                } catch (e: Exception) { e.printStackTrace() }
                                
                                // 4. Navigate
                                isLoading = false
                                navController.navigate("dashboard") {
                                    popUpTo("login") { inclusive = true }
                                }

                            } catch (e: retrofit2.HttpException) {
                                isLoading = false
                                error = if (e.code() == 403) {
                                    "ACESSO BLOQUEADO: ${e.message()}"
                                } else if (e.code() == 401) {
                                    "Credenciais inválidas"
                                } else {
                                    "Erro de servidor: ${e.code()}"
                                }
                            } catch (e: Exception) {
                                isLoading = false
                                error = "Erro de conexão: ${e.message}"
                                e.printStackTrace()
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = Color.Black
                    ),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black)
                    } else {
                        Text("ABRIR CAIXA", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Terminal ID: ${com.parking.stone.data.DeviceManager.deviceId}",
            color = Color.Gray,
            style = MaterialTheme.typography.labelSmall
        )
        Text(
            text = "Versão: ${com.parking.stone.BuildConfig.VERSION_NAME}",
            color = Color.Gray,
            style = MaterialTheme.typography.labelSmall
        )
    }
}

// Removing Keypad components as they are no longer needed

