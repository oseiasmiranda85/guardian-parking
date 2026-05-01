package com.parking.stone.ui.screens

import android.util.Log
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.parking.stone.data.SessionManager
import com.parking.stone.data.model.UserRole
import com.parking.stone.ui.Routes
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(navController: NavController) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val user = SessionManager.currentUser
    
    var isSyncing by remember { mutableStateOf(false) }
    var pendingCount by remember { mutableStateOf(0) }
    var isBlocked by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    
    LaunchedEffect(Unit) {
        while (true) {
            try {
                // 1. Check Status
                if (SessionManager.tenantId != -1) {
                    val token = SessionManager.authToken
                    if (token != null) {
                        val status = com.parking.stone.data.NetworkModule.api.checkStatus("Bearer $token", SessionManager.tenantId)
                        if (status.status == "BLOCKED" || status.status == "CANCELED") {
                            isBlocked = true
                        }
                        
                        // 2. Sync Data & Media (Background)
                        if (!isBlocked) {
                            val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                            val repo = com.parking.stone.data.XSync(db.parkingDao())
                            
                            repo.syncTickets(context)
                            repo.syncSessions()
                            repo.syncConfig()
                            repo.syncDevice() // Heartbeat: mantém terminal como ONLINE
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("Dashboard", "Background sync loop error: ${e.message}")
            }
            
            // Loop every 10 seconds (Dev Mode)
            kotlinx.coroutines.delay(10 * 1000L) 
        }
    }

    if (isBlocked) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.error
        ) {
            Column(
                modifier = Modifier.fillMaxSize().padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Bloqueado",
                    tint = Color.White,
                    modifier = Modifier.size(96.dp)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "ACESSO SUSPENSO",
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Este terminal foi bloqueado administrativamente por questões financeiras ou contratuais.",
                    color = Color.White.copy(alpha = 0.8f),
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(48.dp))
                Button(
                    onClick = { 
                        SessionManager.logout(context)
                        navController.navigate(Routes.LOGIN) 
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Voltar ao Login")
                }
            }
        }
        return
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.surface,
                drawerContentColor = Color.White
            ) {
                // Drawer Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary) // Green
                        .padding(24.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color.Black),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user?.name?.firstOrNull()?.toString()?.uppercase() ?: "U",
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = user?.name ?: "Usuário",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = user?.role?.name ?: "OPERATOR",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Black.copy(alpha = 0.7f)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Drawer Items
                NavigationDrawerItem(
                    label = { Text("Home / Dashboard") },
                    selected = true,
                    onClick = { scope.launch { drawerState.close() } },
                    icon = { Icon(Icons.Default.Home, null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                NavigationDrawerItem(
                    label = { 
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Sincronizar Agora")
                            if (pendingCount > 0) {
                                Badge(containerColor = MaterialTheme.colorScheme.error) { 
                                    Text("$pendingCount", color = Color.White, style = MaterialTheme.typography.labelSmall) 
                                }
                            }
                        }
                    },
                    selected = false,
                    onClick = { 
                        scope.launch { 
                            drawerState.close() 
                            isSyncing = true
                            try {
                                val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                                val repo = com.parking.stone.data.XSync(db.parkingDao())
                                repo.syncTickets(context)
                                repo.syncSessions()
                                repo.syncConfig()
                                pendingCount = repo.getPendingCount(SessionManager.tenantId, context)
                            } catch(e: Exception) {}
                            isSyncing = false
                        }
                    },
                    icon = { Icon(Icons.Default.Sync, null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                if (SessionManager.hasPermission(UserRole.SUPERVISOR)) {
                    NavigationDrawerItem(
                        label = { Text("Cancelar Ticket") },
                        selected = false,
                        onClick = { 
                            scope.launch { 
                                drawerState.close() 
                                navController.navigate(Routes.CANCEL_TICKET)
                            }
                        },
                        icon = { Icon(Icons.Default.Cancel, null, tint = MaterialTheme.colorScheme.error) },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                    )
                    NavigationDrawerItem(
                        label = { Text("Reimprimir Ticket") },
                        selected = false,
                        onClick = { 
                            scope.launch { 
                                drawerState.close() 
                                navController.navigate(Routes.REPRINT_TICKET)
                            }
                        },
                        icon = { Icon(Icons.Default.Print, null) },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                    )
                }

                Divider(modifier = Modifier.padding(vertical = 8.dp), color = Color.Gray.copy(alpha = 0.3f))
                NavigationDrawerItem(
                    label = { Text("Fechamento de Caixa") },
                    selected = false,
                    onClick = { 
                        scope.launch { 
                            drawerState.close() 
                            navController.navigate(Routes.CASH_CLOSING)
                        }
                    },
                    icon = { Icon(Icons.Default.AttachMoney, null, tint = MaterialTheme.colorScheme.primary) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                if (pendingCount > 0) {
                    Text(
                        "Existem $pendingCount itens pendentes de sincronismo. Sincronize antes de sair.",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
                    )
                }

                if (!SessionManager.hasPermission(UserRole.MANAGER)) {
                    NavigationDrawerItem(
                        label = { Text("Sair do Turno (Manter Aberto)") },
                        selected = false,
                        onClick = { 
                            scope.launch { 
                                if (pendingCount > 0) {
                                    android.widget.Toast.makeText(context, "Sincronize os dados antes de sair!", android.widget.Toast.LENGTH_LONG).show()
                                    isSyncing = true
                                    val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                                    val repo = com.parking.stone.data.XSync(db.parkingDao())
                                    repo.syncTickets(context)
                                    pendingCount = repo.getPendingCount(SessionManager.tenantId, context)
                                    isSyncing = false
                                    if (pendingCount > 0) return@launch
                                }
                                drawerState.close() 
                                SessionManager.logout(context)
                                navController.navigate(Routes.LOGIN) { popUpTo(0) }
                            }
                        },
                        icon = { Icon(Icons.Default.HourglassEmpty, null, tint = Color.Yellow) },
                        modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                    )
                }

                Spacer(modifier = Modifier.weight(1f))
                
                NavigationDrawerItem(
                    label = { Text("Sair / Logout") },
                    selected = false,
                    onClick = { 
                        scope.launch {
                            if (pendingCount > 0) {
                                android.widget.Toast.makeText(context, "Sincronize os dados antes de fazer logout!", android.widget.Toast.LENGTH_LONG).show()
                                isSyncing = true
                                val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                                val repo = com.parking.stone.data.XSync(db.parkingDao())
                                repo.syncTickets(context)
                                pendingCount = repo.getPendingCount(SessionManager.tenantId, context)
                                isSyncing = false
                                if (pendingCount > 0) return@launch
                            }
                            SessionManager.logout(context)
                            navController.navigate(Routes.LOGIN) {
                                popUpTo(0)
                            }
                        }
                    },
                    icon = { Icon(Icons.Default.Logout, null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    ) {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text("GUARDIAN PARKING", fontWeight = FontWeight.Bold, letterSpacing = 2.sp) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu")
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        titleContentColor = MaterialTheme.colorScheme.primary,
                        navigationIconContentColor = Color.White
                    )
                )
            },
            containerColor = MaterialTheme.colorScheme.background
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Quick Actions Grid
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    DashboardButton(
                        text = "Entrada",
                        icon = Icons.Default.Add,
                        modifier = Modifier.weight(1f).height(140.dp),
                        onClick = { navController.navigate(Routes.ENTRY) }
                    )
                    
                    DashboardButton(
                        text = "Saída",
                        icon = Icons.Default.ExitToApp,
                        modifier = Modifier.weight(1f).height(140.dp),
                        onClick = { navController.navigate(Routes.EXIT) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Stats Card (Real Data)
                var activeVehicles by remember { mutableStateOf(0) }
                var operatorEntries by remember { mutableStateOf(0) }
                var totalCollected by remember { mutableStateOf(0.0) }
                
                LaunchedEffect(Unit) {
                    while(true) {
                         if (SessionManager.tenantId != -1) {
                             val db = com.parking.stone.data.AppDatabase.getDatabase(navController.context)
                             activeVehicles = db.parkingDao().getActiveVehicleCount(SessionManager.tenantId)
                             
                             // Get current session start time
                             val session = db.cashDao().getCurrentOpenSession(SessionManager.tenantId)
                             if (session != null && SessionManager.currentUser != null) {
                                 val opIdStr = SessionManager.currentUser!!.id
                                 operatorEntries = db.parkingDao().getOperatorEntryCount(
                                     opIdStr, 
                                     session.startTime,
                                     SessionManager.tenantId
                                 )
                                 val stats = db.parkingDao().getPaymentStats(opIdStr, session.startTime, SessionManager.tenantId)
                              totalCollected = stats.sumOf { it.total }
                             }
                             
                             // Update Pending Count
                             val repo = com.parking.stone.data.XSync(db.parkingDao())
                             pendingCount = repo.getPendingCount(SessionManager.tenantId, context)
                         }
                         kotlinx.coroutines.delay(5000) // Refresh every 5s
                    }
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Resumo do Turno", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color.White)
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Veículos no Pátio:", color = Color.Gray)
                            Text("$activeVehicles", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        
                        Spacer(modifier = Modifier.height(4.dp))
                        
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Entradas (Seu Turno):", color = Color.Gray)
                            Text("$operatorEntries", fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        if (SessionManager.hasPermission(UserRole.MANAGER)) {
                            Spacer(modifier = Modifier.height(4.dp))
                            
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total Arrecadado:", color = Color.Gray)
                                Text("R$ %.2f".format(totalCollected), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                scope.launch {
                                    val db = com.parking.stone.data.AppDatabase.getDatabase(context)
                                    val active = db.parkingDao().getActiveEntries(SessionManager.tenantId)
                                    com.parking.stone.hardware.ReceiptPrinter().printInventoryReport(active)
                                    android.widget.Toast.makeText(context, "Imprimindo Inventário...", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.1f))
                        ) {
                            Icon(Icons.Default.Print, null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("IMPRIMIR INVENTARIO")
                        }
                    }
                }
            }
        }

        com.parking.stone.ui.components.SyncProgressDialog(
            isSyncing = isSyncing,
            pendingCount = pendingCount,
            onDismiss = { isSyncing = false }
        )
    }
}

@Composable
fun DashboardButton(
    text: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    ElevatedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.elevatedButtonColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
            contentColor = Color.White
        ),
        elevation = ButtonDefaults.elevatedButtonElevation(defaultElevation = 4.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(12.dp))
            Text(text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }
    }
}
