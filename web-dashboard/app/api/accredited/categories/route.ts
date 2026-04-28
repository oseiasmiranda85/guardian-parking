
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json({ error: 'ID do estabelecimento ausente' }, { status: 400 })

        const categories = await prisma.accreditedCategory.findMany({
            where: { tenantId: parseInt(tenantId) },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(categories)

    } catch (error: any) {
        console.error("[CATEGORIES_GET_ERROR]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tenantId, name } = body

        if (!tenantId || !name) {
            return NextResponse.json({ error: 'TenantId e Nome são obrigatórios' }, { status: 400 })
        }

        const category = await prisma.accreditedCategory.create({
            data: {
                tenantId: parseInt(tenantId),
                name
            }
        })

        return NextResponse.json(category)

    } catch (error: any) {
        console.error("[CATEGORIES_POST_ERROR]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        await prisma.accreditedCategory.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error("[CATEGORIES_DELETE_ERROR]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
