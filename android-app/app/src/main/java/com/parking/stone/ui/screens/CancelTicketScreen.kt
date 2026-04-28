package com.parking.stone.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.parking.stone.data.AppDatabase
import com.parking.stone.data.model.ParkingEntry
import com.parking.stone.data.SessionManager
import kotlinx.coroutines.launch
import java.util.Date
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CancelTicketScreen(navController: NavController) {
    var query by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var foundEntry by remember { mutableStateOf<ParkingEntry?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = AppDatabase.getDatabase(context)
    
    var activeEntries by remember { mutableStateOf<List<ParkingEntry>>(emptyList()) }
    
    LaunchedEffect(Unit) {
        activeEntries = db.parkingDao().getActiveEntries(SessionManager.tenantId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Cancelar Ticket", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(24.dp))

        if (foundEntry == null) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Localizar Ticket", style = MaterialTheme.typography.titleMedium, color = Color.White)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it.uppercase() },
                        label = { Text("Placa ou Nº Ticket") },
                        trailingIcon = {
                            IconButton(onClick = {
                                if (query.isNotEmpty()) {
                                    scope.launch {
                                        val isNumeric = query.all { it.isDigit() }
                                        val entry = if (isNumeric) db.parkingDao().getEntryById(query.toLongOrNull() ?: -1) 
                                                    else db.parkingDao().getActiveEntryByPlate(query, SessionManager.tenantId)
                                        
                                        if (entry != null) {
                                            if (entry.isCancelled) {
                                                error = "Este ticket já foi cancelado."
                                            } else {
                                                foundEntry = entry
                                                error = null
                                            }
                                        } else {
                                            error = "Ticket não encontrado."
                                        }
                                    }
                                }
                            }) { Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.primary) }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                    )
                    
                    // Filtered List
                    val filteredList = activeEntries.filter { 
                        it.plate.contains(query, ignoreCase = true) || it.id.toString().contains(query)
                    }

                    if (filteredList.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Resultados", style = MaterialTheme.typography.titleSmall, color = Color.Gray)
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        androidx.compose.foundation.lazy.LazyColumn(
                            modifier = Modifier.fillMaxWidth().height(300.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(filteredList.size) { index ->
                                val ticket = filteredList[index]
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
                                    modifier = Modifier.fillMaxWidth().clickable { 
                                        foundEntry = ticket
                                        error = null
                                    }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(ticket.plate, fontWeight = FontWeight.Bold, color = Color.White)
                                            Text("Ticket #${ticket.id}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                        }
                                        Text(SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ticket.entryTime)), color = Color.Gray)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Ticket #${foundEntry!!.id}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Placa: ${foundEntry!!.plate}", color = Color.White)
                    Text("Entrada: ${SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(Date(foundEntry!!.entryTime))}", color = Color.White)
                    if (foundEntry!!.isPaid) Text("STATUS: PAGO", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = reason,
                        onValueChange = { reason = it },
                        label = { Text("Motivo do Cancelamento") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    if (reason.length > 5) {
                        scope.launch {
                            val updated = foundEntry!!.copy(isCancelled = true, cancellationReason = reason)
                            db.parkingDao().updateEntry(updated)
                            
                            val printer = com.parking.stone.hardware.ReceiptPrinter()
                            printer.printEntryTicket(
                                eventName = "CANCELAMENTO",
                                plate = updated.plate,
                                type = updated.type,
                                amount = "ESTORNADO",
                                method = "CANCELADO",
                                qrContent = "CANCEL-${updated.id}",
                                photoPath = updated.photoPath
                            )
                            
                            Toast.makeText(context, "Ticket Cancelado!", Toast.LENGTH_LONG).show()
                            navController.popBackStack()
                        }
                    } else {
                        error = "Informe um motivo válido."
                    }
                },
                modifier = Modifier.fillMaxWidth().height(60.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
                Icon(Icons.Default.Warning, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("CONFIRMAR CANCELAMENTO", fontWeight = FontWeight.Bold)
            }
        }
    }
}
