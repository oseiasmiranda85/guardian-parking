
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const owners = await prisma.owner.findMany({
            include: {
                _count: {
                    select: { tenants: true }
                }
            },
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(owners)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, document, email, phone, address } = body

        if (!name || !document || !email) {
            return NextResponse.json({ error: 'Dados obrigatórios faltando.' }, { status: 400 })
        }

        const newOwner = await prisma.owner.create({
            data: {
                name,
                document,
                email,
                phone,
                address
            }
        })

        return NextResponse.json(newOwner, { status: 201 })
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Documento ou Email já cadastrados.' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 })
    }
}
