
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')
        const tenantId = searchParams.get('tenantId')

        if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

        const persona = await prisma.accreditedPersona.findUnique({
            where: { token: token },
            include: { category: true }
        })

        if (!persona) {
            return NextResponse.json({ error: 'Credencial não encontrada' }, { status: 404 })
        }

        if (tenantId && persona.tenantId !== parseInt(tenantId)) {
             return NextResponse.json({ error: 'Credencial não pertence a este estabelecimento' }, { status: 403 })
        }

        // Logic for Expiry
        const now = new Date()
        if (persona.validUntil < now) {
            // Auto inactivate
            if (persona.status === 'ACTIVE') {
                 await prisma.accreditedPersona.update({
                    where: { id: persona.id },
                    data: { status: 'INACTIVE' }
                })
            }
            return NextResponse.json({ error: 'Credencial Expirada / Vencida' }, { status: 403 })
        }

        // Final check on status
        if (persona.status === 'INACTIVE') {
             return NextResponse.json({ error: 'Credencial Inativa' }, { status: 403 })
        }

        return NextResponse.json({
            id: persona.id,
            name: persona.name,
            category: persona.category.name,
            token: persona.token,
            status: persona.status
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
