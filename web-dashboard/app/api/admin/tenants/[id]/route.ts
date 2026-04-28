import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                owner: true,
                subscription: true
            }
        })
        return NextResponse.json(tenant)
    } catch (error) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const body = await request.json()
        const { status, planType, planValue, address, name, latitude, longitude } = body

        // 1. Update Tenant Details (Name, Address)
        if (address || name || latitude !== undefined || longitude !== undefined) {
            await prisma.tenant.update({
                where: { id },
                data: {
                    ...(address && { address }),
                    ...(name && { name }),
                    ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
                    ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null })
                }
            })
        }

        // 2. Prepare Subscription Update
        const subData: any = {}
        if (status) subData.status = status
        if (planType) subData.type = planType

        // Handle Plan Value (allow 0)
        let newPlanValue: number | null = null
        if (planValue !== undefined && planValue !== null && planValue !== '') {
            newPlanValue = parseFloat(planValue)
            if (!isNaN(newPlanValue)) {
                subData.value = newPlanValue
            }
        }

        // 3. Update Subscription if there is data
        let updatedSubscription = null
        if (Object.keys(subData).length > 0) {
            updatedSubscription = await prisma.subscription.update({
                where: { tenantId: id },
                data: subData
            })
        }

        // 4. Cascade Update to PENDING Invoices if Value changed
        if (newPlanValue !== null && !isNaN(newPlanValue)) {
            await prisma.invoice.updateMany({
                where: {
                    tenantId: id,
                    status: 'PENDING'
                },
                data: {
                    amount: newPlanValue
                }
            })
        }

        return NextResponse.json({ success: true, updatedSubscription })

    } catch (error: any) {
        console.error("PATCH Error:", error)
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id)
        const body = await request.json()
        const { password } = body

        if (!password) {
            return NextResponse.json({ error: 'Senha Master é obrigatória para esta ação destrutiva.' }, { status: 400 })
        }

        // Validate MASTER identity
        // To keep it secure regardless of session, we require any valid MASTER password in the system.
        const admins = await prisma.sysAdmin.findMany()
        let isValid = false
        for (const admin of admins) {
            if (bcrypt.compareSync(password, admin.password)) {
                isValid = true
                break
            }
        }

        if (!isValid) {
            return NextResponse.json({ error: 'Senha incorreta. Deleção negada.' }, { status: 403 })
        }

        console.log(`[DELETION] MASTER AUTHORIZED. Erasing Tenant ID: ${id} and all related records...`)

        // Execute Massive Cascade Deletion in a Transaction to respect Foreign Keys
        await prisma.$transaction([
            // Pricing Logic
            prisma.pricingSlot.deleteMany({ where: { table: { tenantId: id } } }),
            prisma.pricingTable.deleteMany({ where: { tenantId: id } }),
            
            // Core Data
            prisma.transaction.deleteMany({ where: { tenantId: id } }),
            prisma.ticket.deleteMany({ where: { tenantId: id } }),
            prisma.vehicle.deleteMany({ where: { tenantId: id } }),
            prisma.device.deleteMany({ where: { tenantId: id } }),
            prisma.tenantUser.deleteMany({ where: { tenantId: id } }),
            prisma.cashSession.deleteMany({ where: { tenantId: id } }),
            prisma.invoice.deleteMany({ where: { tenantId: id } }),
            
            // Sub and Self
            prisma.subscription.deleteMany({ where: { tenantId: id } }),
            prisma.tenant.delete({ where: { id } })
        ])

        return NextResponse.json({ success: true, message: 'Tenant completamente apagado do sistema.' })

    } catch (error: any) {
        console.error("DELETE Error:", error)
        return NextResponse.json({ error: error.message || 'Falha ao deletar dados em cascata.' }, { status: 500 })
    }
}
