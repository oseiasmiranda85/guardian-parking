
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper for 14-digit numerical token
const generate14DigitToken = () => {
    let token = ''
    for (let i = 0; i < 14; i++) {
        token += Math.floor(Math.random() * 10).toString()
    }
    return token
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')

        if (!tenantId) return NextResponse.json([], { status: 400 })

        const tid = parseInt(tenantId)

        const personas = await prisma.accreditedPersona.findMany({
            where: { tenantId: tid },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        })

        // Map to frontend format
        const mapped = personas.map(p => ({
            id: p.id,
            nome: p.name,
            tipo: p.category.name,
            categoryId: p.categoryId,
            status: p.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
            placa: '---', // No longer vehicle based
            qrToken: p.token,
            validUntil: p.validUntil
        }))

        return NextResponse.json(mapped)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { tenantId, name, categoryId, validUntil } = body

        if (!tenantId || !name || !categoryId || !validUntil) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const persona = await prisma.accreditedPersona.create({
            data: {
                tenantId: parseInt(tenantId),
                name,
                categoryId: parseInt(categoryId),
                token: generate14DigitToken(),
                status: 'ACTIVE',
                validUntil: new Date(validUntil)
            },
            include: { category: true }
        })

        return NextResponse.json(persona)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { id, status, name, categoryId, validUntil } = body

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        const updateData: any = {}
        if (status) updateData.status = status
        if (name) updateData.name = name
        if (categoryId) updateData.categoryId = parseInt(categoryId)
        if (validUntil) updateData.validUntil = new Date(validUntil)

        const persona = await prisma.accreditedPersona.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: { category: true }
        })

        return NextResponse.json(persona)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        await prisma.accreditedPersona.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
