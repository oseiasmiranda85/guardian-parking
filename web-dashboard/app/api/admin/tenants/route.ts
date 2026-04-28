import { NextResponse } from 'next/server'
import { verifyAuth, validateTenantAccess } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: Request) {
    try {
        // 1. Verify Auth
        const auth = await verifyAuth(request)
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { searchParams } = new URL(request.url)
        const ownerId = searchParams.get('ownerId')
        const requestedId = searchParams.get('id')

        // 2. Validate Access
        const access = validateTenantAccess(auth.payload, requestedId)
        if (access.error) {
            return NextResponse.json({ error: access.error }, { status: access.status })
        }

        const whereClause: any = {}
        if (access.tenantId) {
            whereClause.id = access.tenantId
        }
        if (auth.payload?.type === 'ADMIN' && ownerId) {
            whereClause.ownerId = parseInt(ownerId)
        }

        const tenants = await prisma.tenant.findMany({
            where: whereClause,
            include: {
                owner: true,
                subscription: true
            }
        })

        return NextResponse.json(tenants)
    } catch (error) {
        console.error('[TENANTS-GET] Error:', error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            ownerName, ownerDocument, ownerEmail, ownerPhone,
            tenantName, tenantAddress, tenantType, totalSpots,
            planType, planValue, referenceMonth, latitude, longitude
        } = body

        // 1. Create or Find Owner
        let owner = await prisma.owner.findUnique({ where: { document: ownerDocument } })

        if (!owner) {
            owner = await prisma.owner.create({
                data: {
                    name: ownerName,
                    document: ownerDocument,
                    email: ownerEmail,
                    phone: ownerPhone
                }
            })
        }

        // 2. Calculate Validity
        const today = new Date()
        let validUntil = new Date(today)
        if (planType === 'RECURRING') {
            validUntil.setFullYear(today.getFullYear() + 1) // 1 Year
        } else {
            validUntil.setDate(today.getDate() + 30) // 30 Days for Event
        }

        // 3. Create Tenant with Subscription
        const newTenant = await prisma.tenant.create({
            data: {
                name: tenantName,
                address: tenantAddress,
                totalSpots: totalSpots ? parseInt(totalSpots) : 50,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                ownerId: owner.id,
                subscription: {
                    create: {
                        type: planType === 'RECURRING' ? 'RECURRING_MONTHLY' : 'ONE_TIME',
                        status: 'ACTIVE',
                        value: parseFloat(planValue || '0'),
                        validUntil: validUntil
                    }
                }
            }
        })

        // 4. Generate Invoices
        if (planValue) {
            const amount = parseFloat(planValue)
            const invoicesToCreate = planType === 'RECURRING' ? 12 : 1

            const invoicesData = []
            for (let i = 0; i < invoicesToCreate; i++) {
                const dueDate = new Date(today)
                dueDate.setMonth(today.getMonth() + i)

                // Reference Month String (MM/YYYY)
                const refDate = new Date(dueDate)
                // If user provided a specific start reference month for the first one, we could shift logic, 
                // but usually "Create Date" implies "Start Now". 
                // We'll stick to simple logic: Ref = Due Date's Month
                const refMonthStr = `${String(refDate.getMonth() + 1).padStart(2, '0')}/${refDate.getFullYear()}`

                invoicesData.push({
                    tenantId: newTenant.id,
                    amount: amount,
                    referenceMonth: refMonthStr,
                    dueDate: dueDate,
                    status: 'PENDING'
                })
            }

            await prisma.invoice.createMany({
                data: invoicesData
            })
        }

        // 4. Create Operational Infrastructure

        // A. (Removed) Clean Slate - User must create Pricing Table manually

        // B. Default Manager User (Required for Access)
        const username = `admin${newTenant.id}`
        const password = Math.random().toString(36).slice(-8) // Random 8 chars

        const manager = await prisma.tenantUser.create({
            data: {
                tenantId: newTenant.id,
                name: 'Gerente Principal',
                username: username,
                password: await hash(password, 10), // Hashed for security
                role: 'MANAGER'
            }
        })

        // 5. Create Default Pricing Table
        await prisma.pricingTable.create({
            data: {
                tenantId: newTenant.id,
                name: 'Tabela Padrão',
                slots: {
                    create: [
                        { minMinutes: 0, maxMinutes: 60, price: 10.00 },
                        { minMinutes: 60, maxMinutes: 120, price: 15.00 },
                        { minMinutes: 120, maxMinutes: 180, price: 20.00 },
                    ]
                }
            }
        })

        // C. (Removed) Clean Slate - User must create Devices manually

        return NextResponse.json({
            tenant: newTenant,
            credentials: {
                username: manager.username,
                password: manager.password
            }
        }, { status: 201 })

    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message || 'Erro ao criar tenant' }, { status: 500 })
    }
}

