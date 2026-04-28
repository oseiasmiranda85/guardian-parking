package com.parking.stone.data

import android.util.Log
import com.parking.stone.data.NetworkModule
import com.parking.stone.data.SessionManager
import com.parking.stone.data.model.ParkingEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.coroutineScope
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody

class XSync(private val dao: ParkingDao) {

    suspend fun syncTickets(context: android.content.Context): Boolean = coroutineScope {
        val tenantId = SessionManager.tenantId
        val token = SessionManager.authToken ?: return@coroutineScope false
        
        // Start Media Sync in parallel
        launch { syncMedia(context) }

        try {
            // 1. UPLOAD Local Unsynced
            val unsynced = dao.getUnsyncedEntries(tenantId)
            if (unsynced.isNotEmpty()) {
                Log.d("XSync", "Uploading ${unsynced.size} tickets...")
                val payload = unsynced.map { t ->
                    TicketSync(
                        uuid = t.uuid,
                        plate = t.plate,
                        entryTime = t.entryTime,
                        exitTime = if (t.exitTime != null && t.exitTime > 0) t.exitTime else null,
                        isPaid = t.isPaid,
                        amount = t.amount,
                        operatorId = t.operatorId ?: "",
                        category = t.category,
                        accreditedId = t.accreditedId ?: "",
                        paymentMethod = t.paymentMethod,
                        type = t.type,
                        billingMode = t.billingMode,
                        deviceId = t.deviceId,
                        exitDeviceId = t.exitDeviceId,
                        photoUrl = t.photoUrl,
                        status = when {
                            t.isCancelled -> "CANCELLED"
                            t.exitTime != null && t.exitTime > 0 -> "EXITED"
                            t.isPaid -> "PAID"
                            else -> "OPEN"
                        }
                    )
                }
                val response = NetworkModule.api.syncTickets("Bearer $token", tenantId.toString(), payload)
                if (response.success) {
                    dao.markAsSynced(unsynced.map { it.id })
                }
            }

            // 2. DOWNLOAD Cloud Active (for Shared Exit)
            Log.d("XSync", "Downloading active tickets for shared exit...")
            val cloudActive = NetworkModule.api.getActiveTickets("Bearer $token", tenantId.toString())
            cloudActive.forEach { ct ->
                // NEW: Find by UUID (Infalible)
                val local = dao.getEntryByUuid(ct.uuid)
                
                // If it's a match, use its local ID to update. If not, it's a new ticket (id=0).
                val entryToSave = ParkingEntry(
                    id = local?.id ?: 0,
                    uuid = ct.uuid,
                    plate = ct.plate,
                    type = ct.type ?: "Carro",
                    entryTime = ct.entryTime,
                    exitTime = ct.exitTime,
                    isPaid = ct.isPaid,
                    amount = ct.amount,
                    operatorId = ct.operatorId,
                    tenantId = tenantId,
                    category = ct.category ?: "ROTATIVO",
                    billingMode = ct.billingMode ?: "POSTPAID",
                    deviceId = ct.deviceId,
                    photoUrl = ct.photoUrl,
                    isSynced = true // It came from cloud, so it's synced
                )
                dao.upsertEntry(entryToSave)
            }
            
            return@coroutineScope true
        } catch (e: Exception) {
            Log.e("XSync", "Sync failed: ${e.message}", e)
        }
        return@coroutineScope false
    }

    suspend fun syncDevice(): Boolean = withContext(Dispatchers.IO) {
        val tenantId = SessionManager.tenantId
        val token = SessionManager.authToken ?: return@withContext false
        val user = SessionManager.currentUser ?: return@withContext false

        return@withContext try {
            val heartbeat = DeviceHeartbeat(
                deviceId = DeviceManager.deviceId,
                operatorName = user.name,
                operatorId = user.id
            )
            val response = NetworkModule.api.syncDevice("Bearer $token", tenantId.toString(), heartbeat)
            Log.d("XSync", "Device heartbeat: ${DeviceManager.deviceId} operator=${user.name} -> success=${response.success}")
            response.success
        } catch (e: Exception) {
            Log.w("XSync", "Device heartbeat failed (non-critical): ${e.message}")
            false
        }
    }

    suspend fun syncSessions(): Boolean = withContext(Dispatchers.IO) {
        val tenantId = SessionManager.tenantId
        val token = SessionManager.authToken ?: return@withContext false
        
        try {
            val sessions = dao.getAllSessions(tenantId)
            Log.d("XSync", "Syncing sessions for tenant $tenantId. Found: ${sessions.size}")
            
            if (sessions.isEmpty()) return@withContext true

            val payload = sessions.map { s ->
                SessionSync(
                    id = s.id,
                    userId = s.userId,
                    deviceId = s.deviceId,
                    startTime = s.startTime,
                    endTime = s.endTime ?: 0L,
                    startBalance = s.startBalance,
                    closingBalance = s.closingBalance ?: 0.0,
                    status = s.status,
                    totalRevenue = s.totalRevenue
                )
            }

            val response = NetworkModule.api.syncSessions("Bearer $token", tenantId.toString(), payload)
            Log.d("XSync", "Sessions sync response: ${response.success}")
            return@withContext response.success
        } catch (e: Exception) {
            Log.e("XSync", "Session sync failed for tenant $tenantId", e)
        }
        return@withContext false
    }

    suspend fun syncMedia(context: android.content.Context): Boolean = withContext(Dispatchers.IO) {
        val tenantId = SessionManager.tenantId
        val token = SessionManager.authToken ?: return@withContext false
        
        try {
            // Find entries with local photos that haven't been uploaded yet
            val pendingPhotos = dao.getEntriesWithPendingPhotos(tenantId)
            if (pendingPhotos.isEmpty()) return@withContext true
            
            Log.d("XSync", "Uploading ${pendingPhotos.size} photos...")
            
            pendingPhotos.forEach { entry ->
                val file = java.io.File(entry.photoPath!!)
                if (file.exists()) {
                    val mediaType = "image/jpeg".toMediaTypeOrNull()
                    val requestFile = file.asRequestBody(mediaType)
                    val body = okhttp3.MultipartBody.Part.createFormData("file", file.name, requestFile)
                    
                    val tenantIdBody = tenantId.toString().toRequestBody("text/plain".toMediaTypeOrNull())
                    val ticketIdBody = entry.id.toString().toRequestBody("text/plain".toMediaTypeOrNull())
                    val uuidBody = entry.uuid.toRequestBody("text/plain".toMediaTypeOrNull())
                    val plateBody = entry.plate.toRequestBody("text/plain".toMediaTypeOrNull())
                    val entryTimeBody = entry.entryTime.toString().toRequestBody("text/plain".toMediaTypeOrNull())
                    
                    val response = NetworkModule.api.uploadPhoto("Bearer $token", tenantIdBody, ticketIdBody, uuidBody, plateBody, entryTimeBody, body)
                    
                    if (response.success) {
                        // The server saves as [uuid].jpg now
                        val serverPath = "/uploads/$tenantId/${entry.uuid}.jpg"
                        dao.updatePhotoUrl(entry.id, serverPath)
                        Log.d("XSync", "Photo uploaded and linked via UUID: $serverPath")
                    }
                } else {
                    // File deleted or missing? Mark as null to avoid retry
                    dao.updatePhotoPath(entry.id, null)
                }
            }
            return@withContext true
        } catch (e: Exception) {
            Log.e("XSync", "Media sync failed: ${e.message}")
        }
        return@withContext false
    }

    suspend fun syncConfig() {
        val tenantId = SessionManager.tenantId
        val token = SessionManager.authToken ?: return
        
        try {
            val pricing = NetworkModule.api.getActivePricing("Bearer $token", tenantId, true)
            if (pricing != null) {
                Log.d("XSync", "Config synced: billingMode=${pricing.billingMode}")
                // Save to ConfigManager (Mock/Local)
                ConfigManager.paymentTiming = if (pricing.billingMode == "PREPAID") 
                    ConfigManager.PaymentTiming.ENTRY else ConfigManager.PaymentTiming.EXIT
            }
        } catch (e: Exception) {
            Log.e("XSync", "Config sync failed", e)
        }
    }
}
