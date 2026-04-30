package com.parking.stone.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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

    var showTenantSelector by remember { mutableStateOf(false) }
    var availableTenants by remember { mutableStateOf<List<com.parking.stone.data.TenantInfo>>(emptyList()) }

    if (showTenantSelector) {
        AlertDialog(
            onDismissRequest = { showTenantSelector = false; isLoading = false },
            title = { Text("Selecione o Estabelecimento") },
            text = {
                LazyColumn {
                    items(availableTenants.size) { index ->
                        val tenant = availableTenants[index]
                        ListItem(
                            headlineContent = { Text(tenant.name) },
                            modifier = androidx.compose.ui.Modifier.clickable {
                                showTenantSelector = false
                                isLoading = true
                                scope.launch {
                                    try {
                                        val response = com.parking.stone.data.NetworkModule.api.login(
                                            mapOf(
                                                "email" to username,
                                                "password" to password,
                                                "deviceId" to com.parking.stone.data.DeviceManager.deviceId,
                                                "selectedTenantId" to tenant.id.toString()
                                            )
                                        )
                                        processLoginResponse(response, context, navController, scope, { isLoading = it }, { error = it })
                                    } catch (e: Exception) {
                                        isLoading = false
                                        error = "Erro ao selecionar: ${e.message}"
                                    }
                                }
                            }
                        )
                    }
                }
            },
            confirmButton = {}
        )
    }

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
                                val response = com.parking.stone.data.NetworkModule.api.login(
                                    mapOf(
                                        "email" to username, 
                                        "password" to password,
                                        "deviceId" to com.parking.stone.data.DeviceManager.deviceId
                                    )
                                )
                                
                                if (response.status == "MULTIPLE_TENANTS") {
                                    availableTenants = response.tenants ?: emptyList()
                                    showTenantSelector = true
                                    return@launch
                                }

                                processLoginResponse(response, context, navController, scope, { isLoading = it }, { error = it })

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


private suspend fun processLoginResponse(
    response: com.parking.stone.data.LoginResponse,
    context: android.content.Context,
    navController: NavController,
    scope: kotlinx.coroutines.CoroutineScope,
    setLoading: (Boolean) -> Unit,
    setError: (String) -> Unit
) {
    if (response.token == null || response.user == null || response.tenant == null) {
        setLoading(false)
        setError("Dados de login incompletos")
        return
    }

    val db = AppDatabase.getDatabase(context)
    val existingSession = db.cashDao().getCurrentOpenSession(response.tenant.id)
    
    if (existingSession != null && existingSession.userId != response.user.id) {
        setLoading(false)
        setError("CAIXA PENDENTE: O operador ${existingSession.userName} ainda possui um caixa aberto neste terminal. Encerre o faturamento antes de trocar de usuário.")
        return
    }

    val sessionId = if (existingSession == null) {
        val newSession = CashSession(
            id = java.util.UUID.randomUUID().toString(),
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
    
    val roleEnum = try {
        UserRole.valueOf(response.user.role)
    } catch (e: Exception) { UserRole.OPERATOR }

    SessionManager.login(
        context = context,
        userId = response.user.id.toString(),
        email = response.user.email, 
        role = roleEnum, 
        sessionId = sessionId,
        token = response.token,
        tenant = response.tenant.id
    )

    val repo = com.parking.stone.data.XSync(db.parkingDao())
    try {
        repo.syncConfig()
        repo.syncSessions()
        repo.syncDevice()
    } catch (e: Exception) { e.printStackTrace() }
    
    setLoading(false)
    navController.navigate("dashboard") {
        popUpTo("login") { inclusive = true }
    }
}
