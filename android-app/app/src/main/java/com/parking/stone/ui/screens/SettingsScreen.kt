package com.parking.stone.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.parking.stone.data.ConfigManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("CONFIGURAÇÕES", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.Black,
                    titleContentColor = MaterialTheme.colorScheme.primary,
                    navigationIconContentColor = Color.White
                )
            )
        },
        containerColor = Color.Black
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Text(
                "ATENDIMENTO E FLUXO",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                letterSpacing = 2.sp
            )

            ConfigSwitch(
                title = "Saída Automática",
                description = "Libera a saída instantaneamente ao ler um QR Code que já foi pago.",
                icon = Icons.Default.FlashOn,
                checked = ConfigManager.autoRelease,
                onCheckedChange = { ConfigManager.autoRelease = it }
            )

            ConfigSwitch(
                title = "Impressão Automática (Entrada)",
                description = "Dispara o ticket assim que a placa é reconhecida pela câmera.",
                icon = Icons.Default.Print,
                checked = ConfigManager.autoPrintEntry,
                onCheckedChange = { ConfigManager.autoPrintEntry = it }
            )

            ConfigSwitch(
                title = "Ticket de Saída Obrigatório",
                description = "Sempre imprimir o recibo de pagamento no momento da saída.",
                icon = Icons.Default.Receipt,
                checked = ConfigManager.requireExitTicket,
                onCheckedChange = { ConfigManager.requireExitTicket = it }
            )

            Divider(color = Color.White.copy(alpha = 0.1f))

            Text(
                "HARDWARE E VISÃO",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                letterSpacing = 2.sp
            )

            ConfigSwitch(
                title = "Busca por Placa",
                description = "Permitir busca manual de veículos no pátio através da placa.",
                icon = Icons.Default.Search,
                checked = ConfigManager.allowPlateSearch,
                onCheckedChange = { ConfigManager.allowPlateSearch = it }
            )

            ConfigSwitch(
                title = "Flash Automático",
                description = "Ativar o flash da câmera em ambientes com baixa iluminação.",
                icon = Icons.Default.FlashlightOn,
                checked = true, // Mocked for now
                onCheckedChange = { }
            )

            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                "Versão do Sistema: 1.8.8",
                modifier = Modifier.align(Alignment.CenterHorizontally),
                color = Color.Gray,
                fontSize = 10.sp,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
            )
        }
    }
}

@Composable
fun ConfigSwitch(
    title: String,
    description: String,
    icon: ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(Color.White.copy(alpha = 0.05f), MaterialTheme.shapes.medium),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = if (checked) MaterialTheme.colorScheme.primary else Color.Gray)
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
            Text(description, color = Color.Gray, fontSize = 12.sp, lineHeight = 16.sp)
        }

        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.Black,
                checkedTrackColor = MaterialTheme.colorScheme.primary,
                uncheckedThumbColor = Color.Gray,
                uncheckedTrackColor = Color.Black,
                uncheckedBorderColor = Color.Gray
            )
        )
    }
}
