package com.parking.stone.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Search
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
import com.parking.stone.hardware.ReceiptPrinter
import kotlinx.coroutines.launch
import java.util.Date
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReprintTicketScreen(navController: NavController) {
    var query by remember { mutableStateOf("") }
    var foundEntry by remember { mutableStateOf<ParkingEntry?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = AppDatabase.getDatabase(context)
    
    var activeEntries by remember { mutableStateOf<List<ParkingEntry>>(emptyList()) }
    
    LaunchedEffect(Unit) {
        // Reuse same query or create a new "getRecentEntries" if performance is issue. 
        activeEntries = db.parkingDao().getActiveEntries(SessionManager.tenantId)
    }

    Column(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Reimprimir Ticket", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(24.dp))

        if (foundEntry == null) {
            // SEARCH UI (Reused pattern)
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
                                            foundEntry = entry
                                            error = null
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
                    if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error)
                    
                    // Filtered List
                    val filteredList = activeEntries.filter { 
                        it.plate.contains(query, ignoreCase = true) || it.id.toString().contains(query)
                    }

                    if (filteredList.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Últimos Tickets", style = MaterialTheme.typography.titleSmall, color = Color.Gray)
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
                    
                    if (foundEntry!!.isCancelled) {
                        Text("CANCELADO", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                    } else if (foundEntry!!.isPaid) {
                        Text("PAGO", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    } else {
                        Text("EM ABERTO", color = Color.Yellow, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    val printer = ReceiptPrinter()
                    printer.printEntryTicket(
                        eventName = "2ª VIA",
                        plate = foundEntry!!.plate,
                        type = foundEntry!!.type,
                        amount = if(foundEntry!!.isPaid) "BIT. PAGO" else "---",
                        method = foundEntry!!.paymentMethod ?: "---",
                        qrContent = "REPRINT-${foundEntry!!.entryTime}",
                        photoPath = foundEntry!!.photoPath
                    )
                    Toast.makeText(context, "Enviado para Impressora", Toast.LENGTH_SHORT).show()
                    navController.popBackStack()
                },
                modifier = Modifier.fillMaxWidth().height(60.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.Black)
            ) {
                Icon(Icons.Default.Print, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("IMPRIMIR 2ª VIA", fontWeight = FontWeight.Bold)
            }
        }
    }
}
