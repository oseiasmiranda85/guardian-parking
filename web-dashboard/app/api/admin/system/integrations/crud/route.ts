
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, type, targetUrl, apiKey, tenantId } = body

        if (!name || !type) return NextResponse.json({ error: 'Nome e Tipo são obrigatórios' }, { status: 400 })

        const integ = await prisma.externalIntegration.create({
            data: {
                name,
                type,
                targetUrl,
                apiKey,
                tenantId: tenantId ? parseInt(tenantId) : null,
                status: 'ACTIVE'
            }
        })

        return NextResponse.json(integ)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        await prisma.externalIntegration.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
