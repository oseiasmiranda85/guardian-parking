
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: Fetch Pricing Tables
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const tenantId = searchParams.get('tenantId')
        const activeOnly = searchParams.get('active') === 'true'

        if (!tenantId) return NextResponse.json([], { status: 400 })
        const tid = parseInt(tenantId)

        const vehicleType = searchParams.get('vehicleType')

        if (activeOnly) {
            // Fetch ONLY the active table (for POS) by vehicle type if provided
            const whereClause: any = { tenantId: tid, isActive: true }
            if (vehicleType) whereClause.vehicleType = vehicleType

            const activeTable = await prisma.pricingTable.findFirst({
                where: whereClause,
                include: { slots: { orderBy: { minMinutes: 'asc' } } }
            })
            
            if (!activeTable) {
                // Extended fallback considering vehicle type
                const fallbackWhere: any = { tenantId: tid }
                if (vehicleType) fallbackWhere.vehicleType = vehicleType

                const anyTable = await prisma.pricingTable.findFirst({
                    where: fallbackWhere,
                    include: { slots: { orderBy: { minMinutes: 'asc' } } }
                })
                return NextResponse.json(anyTable || null)
            }
            return NextResponse.json(activeTable)
        } else {
            // Fetch ALL tables (for Manager)
            const tables = await prisma.pricingTable.findMany({
                where: { tenantId: tid },
                include: { slots: { orderBy: { minMinutes: 'asc' } } }
            })
            return NextResponse.json(tables)
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Create or Update Table
export async function POST(request: Request) {
    try {
        const body = await request.json()


        const { tableId, tenantId, name, slots, isActive, vehicleType, type } = body

        if (!tenantId) {
            console.error('Missing tenantId')
            return NextResponse.json({ error: 'Missing Tenant ID' }, { status: 400 })
        }

        const tid = parseInt(tenantId)
        if (isNaN(tid)) {
            console.error('Invalid tenantId:', tenantId)
            return NextResponse.json({ error: 'Invalid Tenant ID' }, { status: 400 })
        }

        // Deactivate others OF THE SAME VEHICLE TYPE if this one is active
        if (isActive) {
            await prisma.pricingTable.updateMany({
                where: { 
                    tenantId: tid,
                    vehicleType: vehicleType || 'CAR' 
                },
                data: { isActive: false }
            })
        }

        let table;

        if (tableId) {
            console.log('Updating Table ID:', tableId)
            // UPDATE Existing
            await prisma.$transaction(async (tx) => {
                // 1. Update Parent
                table = await tx.pricingTable.update({
                    where: { id: parseInt(tableId) }, // Ensure Int
                    data: {
                        name: name,
                        isActive: isActive,
                        vehicleType: vehicleType || 'CAR',
                        type: type || 'DURATION',
                        billingMode: body.billingMode || 'POSTPAID'
                    }
                })

                // 2. Replace Slots
                if (Array.isArray(slots)) {
                    await tx.pricingSlot.deleteMany({ where: { tableId: parseInt(tableId) } })

                    // Prepare slots data with safety checks
                    const slotData = slots.map((s: any) => ({
                        tableId: parseInt(tableId),
                        minMinutes: parseInt(s.minMinutes) || 0,
                        maxMinutes: parseInt(s.maxMinutes) || 0,
                        startTime: s.startTime || null,
                        endTime: s.endTime || null,
                        price: parseFloat(s.price) || 0
                    }))

                    console.log('Saving Slots:', slotData)

                    if (slotData.length > 0) {
                        await tx.pricingSlot.createMany({
                            data: slotData
                        })
                    }
                }
            })
        } else {
            console.log('Creating New Table')
            // CREATE New
            if (!name) return NextResponse.json({ error: 'Missing Name' }, { status: 400 })

            // Prepare slots first to avoid inline map issues
            const slotCreateData = Array.isArray(slots) ? slots.map((s: any) => ({
                minMinutes: parseInt(s.minMinutes) || 0,
                maxMinutes: parseInt(s.maxMinutes) || 0,
                startTime: s.startTime || null,
                endTime: s.endTime || null,
                price: parseFloat(s.price) || 0
            })) : []

            table = await prisma.pricingTable.create({
                data: {
                    tenantId: tid,
                    name,
                    vehicleType: vehicleType || 'CAR',
                    type: type || 'DURATION',
                    billingMode: body.billingMode || 'POSTPAID',
                    isActive: isActive || false,
                    slots: {
                        create: slotCreateData
                    }
                }
            })
        }

        console.log('Success:', table)
        return NextResponse.json(table)

    } catch (error: any) {
        console.error('Pricing Save Error:', error)
        // Return explicit error message to frontend
        return NextResponse.json({
            error: error.message || 'Database Transaction Failed',
            details: error.meta || error.code
        }, { status: 500 })
    }
}

// DELETE: Remove a Pricing Table
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        // Delete cascading slots first
        await prisma.pricingSlot.deleteMany({
            where: { tableId: parseInt(id) }
        })

        // Delete parent table
        await prisma.pricingTable.delete({
            where: { id: parseInt(id) }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Pricing Delete Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
