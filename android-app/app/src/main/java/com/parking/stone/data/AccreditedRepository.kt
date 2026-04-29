package com.parking.stone.data

import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class AccreditedUser(
    val id: String,
    val name: String,
    val category: String,
    val token: String,
    val status: String
)

class AccreditedRepository {
    private val client = OkHttpClient()
    private val BASE_URL = "https://guardian-portal-h651.onrender.com/api/accredited/validate"

    suspend fun validateQrCode(token: String, tenantId: Int): AccreditedUser? = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL?token=$token&tenantId=$tenantId"
            val request = Request.Builder().url(url).build()
            
            val response = client.newCall(request).execute()
            val body = response.body?.string()
            
            if (response.isSuccessful && body != null) {
                val json = JSONObject(body)
                return@withContext AccreditedUser(
                    id = json.getString("id"),
                    name = json.getString("name"),
                    category = json.getString("category"),
                    token = json.getString("token"),
                    status = json.getString("status")
                )
            } else {
                Log.e("AccreditedRepo", "Error validating QR: ${response.code} - $body")
                return@withContext null
            }
        } catch (e: Exception) {
            Log.e("AccreditedRepo", "Network error", e)
            return@withContext null
        }
    }
}
