import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        // 1. Fetch Source Table
        const sourceTable = await prisma.pricingTable.findUnique({
            where: { id },
            include: { slots: true }
        })

        if (!sourceTable) {
            return NextResponse.json({ error: 'Tabela original não encontrada' }, { status: 404 })
        }

        // 2. Create New Table (Draft)
        const newTable = await prisma.pricingTable.create({
            data: {
                tenantId: sourceTable.tenantId,
                name: `[CÓPIA] ${sourceTable.name}`,
                vehicleType: sourceTable.vehicleType,
                type: sourceTable.type,
                billingMode: sourceTable.billingMode,
                isActive: false, // Always starts as draft
                slots: {
                    create: sourceTable.slots.map(slot => ({
                        minMinutes: slot.minMinutes,
                        maxMinutes: slot.maxMinutes,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        price: slot.price
                    }))
                }
            },
            include: { slots: true }
        })

        return NextResponse.json(newTable)

    } catch (error: any) {
        console.error("Error copying pricing table:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
