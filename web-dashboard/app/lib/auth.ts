import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secure-key-123')

export async function verifyAuth(request?: Request) {
    const cookieStore = cookies()
    let token = cookieStore.get('guardian_token')?.value

    // Fallback to Authorization Header
    if (!token && request) {
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7)
        }
    }

    if (!token) {
        return { error: 'Não autorizado', status: 401 }
    }

    try {
        const verified = await jwtVerify(token, JWT_SECRET)
        return { payload: verified.payload }
    } catch (err) {
        return { error: 'Token inválido', status: 401 }
    }
}

/**
 * Validates if the user has access to the requested tenantId.
 * - ADMIN: Access unrestricted (returns requested tenantId or null for global).
 * - TENANT: Access restricted to their own tenantId.
 */
export function validateTenantAccess(userPayload: any, requestedTenantId: string | null) {
    if (userPayload.type === 'ADMIN') {
        return { 
            tenantId: requestedTenantId ? parseInt(requestedTenantId) : null,
            isGlobal: !requestedTenantId
        }
    }

    if (userPayload.type === 'TENANT') {
        // Always force their own tenantId
        return { 
            tenantId: userPayload.tenantId,
            isGlobal: false
        }
    }

    return { error: 'Acesso negado', status: 403 }
}
