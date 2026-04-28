
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secure-key-123')

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Exclude auth routes, static files and the login page (root)
    if (pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname === '/') {
        return NextResponse.next()
    }

    let token = request.cookies.get('guardian_token')?.value

    // Support Bearer Token from Authorization Header
    const authHeader = request.headers.get('Authorization')
    if (!token && authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
    }

    if (!token) {
        if (!pathname.startsWith('/api/')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        console.warn(`[MIDDLEWARE] Blocked: No token for ${pathname}`)
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    console.log(`[MIDDLEWARE] Processing request: ${pathname}`)

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const userTenantId = payload.tenantId as number | null
        const userRole = payload.role as string

        console.log(`[MIDDLEWARE] User: ${userRole} | Path: ${pathname}`)

        // MASTER can access everything
        if (userRole === 'MASTER') {
            return NextResponse.next()
        }

        // RBAC: Operator Route Blocking
        const restrictedUIRoutes = ['/admin', '/reports', '/users', '/settings', '/dashboard', '/finance']
        const restrictedApiRoutes = ['/api/admin', '/api/users', '/api/reports', '/api/finance', '/api/dashboard']
        
        if (userRole === 'OPERATOR') {
            const isRestrictedUI = restrictedUIRoutes.some(route => pathname.startsWith(route) || pathname === route)
            const isRestrictedApi = restrictedApiRoutes.some(route => pathname.startsWith(route))
            
            if (isRestrictedUI) {
                console.warn(`[MIDDLEWARE] RBAC Block (UI): Operator tried to access ${pathname}`)
                return NextResponse.redirect(new URL('/tickets', request.url)) // redirect to POS
            }
            if (isRestrictedApi) {
                console.warn(`[MIDDLEWARE] RBAC Block (API): Operator tried to access ${pathname}`)
                return NextResponse.json({ error: 'Proibido: Operador de Caixa' }, { status: 403 })
            }
        }

        // Tenant Isolation Check for API
        if (pathname.startsWith('/api/')) {
            const paramTenantId = request.nextUrl.searchParams.get('tenantId')
            if (paramTenantId) {
                if (parseInt(paramTenantId) !== userTenantId) {
                    return NextResponse.json({ error: 'Acesso Proibido: Você não pertence a este estacionamento.' }, { status: 403 })
                }
            }
        }

        return NextResponse.next()

    } catch (e) {
        // redirect to login if ui route
        if (!pathname.startsWith('/api/')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
}

export const config = {
    // Math everything except static assets
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
