import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const owner = await prisma.owner.findUnique({
            where: { id },
            include: { tenants: true }
        })

        if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(owner)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
