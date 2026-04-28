
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) {
            return NextResponse.json({ error: 'TenantId é obrigatório para exclusão em massa' }, { status: 400 })
        }

        const tid = parseInt(tenantId)

        // Delete all personas for this tenant
        const deleted = await prisma.accreditedPersona.deleteMany({
            where: { tenantId: tid }
        })

        return NextResponse.json({ 
            success: true, 
            count: deleted.count,
            message: `${deleted.count} credenciados removidos com sucesso.`
        })

    } catch (error: any) {
        console.error("[BULK_DELETE_ERROR]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
