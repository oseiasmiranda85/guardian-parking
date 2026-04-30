package com.parking.stone.data

import retrofit2.http.*
import okhttp3.RequestBody
import okhttp3.MultipartBody

data class LoginResponse(
    val status: String? = null,
    val token: String? = null, 
    val user: UserInfo? = null, 
    val tenant: TenantInfo? = null,
    val tenants: List<TenantInfo>? = null
)
data class UserInfo(val id: Int, val name: String, val email: String, val role: String)
data class TenantInfo(val id: Int, val name: String)
data class DeviceConfig(
    val requireExitTicket: Boolean,
    val autoRelease: Boolean,
    val autoPrintEntry: Boolean,
    val toleranceMinutes: Int,
    val requireEntryPhoto: Boolean,
    val requireExitPhoto: Boolean,
    val ticketLayout: String?
)
data class SyncResponse(val success: Boolean, val message: String? = null, val count: Int? = null, val config: DeviceConfig? = null)
data class StatusResponse(val status: String)
data class PricingSlot(
    val minMinutes: Int,
    val maxMinutes: Int,
    val price: Double,
    val startTime: String? = null,
    val endTime: String? = null
)
data class PricingTable(
    val id: Int, 
    val name: String,
    val billingMode: String,
    val type: String, // DURATION or FIXED_TIME
    val slots: List<PricingSlot> = emptyList()
)
data class DeviceHeartbeat(val deviceId: String, val operatorName: String?, val operatorId: String?)

data class TicketSync(
    val uuid: String,
    val plate: String,
    val entryTime: Long,
    val exitTime: Long? = null,
    val isPaid: Boolean,
    val amount: Double,
    val operatorId: String,
    val category: String,
    val accreditedId: String,
    val paymentMethod: String? = null,
    val type: String? = null,
    val billingMode: String? = null,
    val deviceId: String? = null,       // ID único do terminal POS de entrada
    val exitDeviceId: String? = null,   // ID único do terminal POS de saída
    val status: String? = null,         // OPEN, PAID, EXITED, CANCELLED
    val photoUrl: String? = null        // URL da foto no servidor
)

data class SessionSync(
    val id: String,
    val userId: Int,
    val deviceId: String? = null,
    val startTime: Long,
    val endTime: Long,
    val startBalance: Double,
    val closingBalance: Double,
    val status: String,
    val totalRevenue: Double
)

data class AuthorizePinResponse(
    val success: Boolean,
    val user: UserData
)

data class UserData(
    val id: Int,
    val name: String,
    val role: String
)

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body credentials: Map<String, String>): LoginResponse
    @POST("api/auth/authorize-pin")
    suspend fun authorizePin(@Body data: Map<String, String>): AuthorizePinResponse
    @POST("api/sync/device")
    suspend fun syncDevice(@Header("Authorization") token: String, @Header("x-tenant-id") tenantId: String, @Body heartbeat: DeviceHeartbeat): SyncResponse
    @POST("api/sync/tickets")
    suspend fun syncTickets(@Header("Authorization") token: String, @Header("x-tenant-id") tenantId: String, @Body tickets: List<TicketSync>): SyncResponse
    @GET("api/sync/tickets")
    suspend fun getActiveTickets(@Header("Authorization") token: String, @Header("x-tenant-id") tenantId: String): List<TicketSync>
    @POST("api/sync/sessions")
    suspend fun syncSessions(@Header("Authorization") token: String, @Header("x-tenant-id") tenantId: String, @Body sessions: List<SessionSync>): SyncResponse
    @Multipart
    @POST("api/sync/media")
    suspend fun uploadPhoto(
        @Header("Authorization") token: String, 
        @Part("tenantId") tenantId: RequestBody, 
        @Part("ticketId") ticketId: RequestBody,
        @Part("uuid") uuid: RequestBody,
        @Part("plate") plate: RequestBody,
        @Part("entryTime") entryTime: RequestBody,
        @Part file: MultipartBody.Part
    ): SyncResponse
    @GET("api/tenant/status")
    suspend fun checkStatus(@Header("Authorization") token: String, @Query("tenantId") tenantId: Int): StatusResponse
    @GET("api/pricing")
    suspend fun getActivePricing(
        @Header("Authorization") token: String, 
        @Query("tenantId") tenantId: Int, 
        @Query("active") active: Boolean,
        @Query("vehicleType") vehicleType: String? = null
    ): PricingTable?
}
