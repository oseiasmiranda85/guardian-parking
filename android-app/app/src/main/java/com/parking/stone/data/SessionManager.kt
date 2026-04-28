package com.parking.stone.data

import android.content.Context
import android.content.SharedPreferences
import com.parking.stone.data.model.UserRole

object SessionManager {
    private const val PREFS_NAME = "guardian_parking_prefs"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_ROLE = "user_role"
    private const val KEY_TOKEN = "auth_token"
    private const val KEY_TENANT_ID = "tenant_id"
    private const val KEY_SESSION_ID = "session_id"

    var currentUser: User? = null
    var currentSessionId: String? = null
    var authToken: String? = null
    var tenantId: Int = -1

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun init(context: Context) {
        val prefs = getPrefs(context)
        val userId = prefs.getString(KEY_USER_ID, null)
        if (userId != null) {
            currentUser = User(
                id = userId,
                name = prefs.getString(KEY_USER_NAME, "") ?: "",
                email = prefs.getString(KEY_USER_EMAIL, "") ?: "",
                role = UserRole.valueOf(prefs.getString(KEY_USER_ROLE, UserRole.OPERATOR.name) ?: UserRole.OPERATOR.name)
            )
            authToken = prefs.getString(KEY_TOKEN, null)
            tenantId = prefs.getInt(KEY_TENANT_ID, -1)
            currentSessionId = prefs.getString(KEY_SESSION_ID, null)
        }
    }

    fun login(context: Context, userId: String, email: String, role: UserRole, sessionId: String?, token: String, tenant: Int) {
        val name = email.split("@")[0]
        currentUser = User(id = userId, name = name, email = email, role = role)
        currentSessionId = sessionId
        authToken = token
        tenantId = tenant

        getPrefs(context).edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_NAME, name)
            putString(KEY_USER_EMAIL, email)
            putString(KEY_USER_ROLE, role.name)
            putString(KEY_TOKEN, token)
            putInt(KEY_TENANT_ID, tenant)
            putString(KEY_SESSION_ID, sessionId)
            apply()
        }
    }

    fun logout(context: Context) {
        currentUser = null
        currentSessionId = null
        authToken = null
        tenantId = -1
        getPrefs(context).edit().clear().apply()
    }

    data class User(
        val id: String,
        val name: String,
        val email: String,
        val role: UserRole
    )

    fun hasPermission(requiredRole: UserRole): Boolean {
        val current = currentUser?.role ?: return false
        return when (requiredRole) {
            UserRole.MASTER -> current == UserRole.MASTER
            UserRole.MANAGER -> current == UserRole.MASTER || current == UserRole.MANAGER
            UserRole.SUPERVISOR -> current == UserRole.MASTER || current == UserRole.MANAGER || current == UserRole.SUPERVISOR
            UserRole.OPERATOR -> true
        }
    }
}
