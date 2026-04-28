
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

export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get('x-api-key')
        // Simple security mock for the "most common pattern"
        if (apiKey !== process.env.EXTERNAL_API_KEY && apiKey !== 'park-master-key') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { tenantId, items } = body

        if (!tenantId || !Array.isArray(items)) {
            return NextResponse.json({ error: 'TenantId e lista de items são obrigatórios' }, { status: 400 })
        }

        const tid = parseInt(tenantId)
        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[]
        }

        for (const item of items) {
            try {
                const { externalId, name, categoryName, validUntil, status } = item

                if (!name || !categoryName || !validUntil) {
                    results.errors.push(`Item incompleto: ${name || 'sem nome'}`)
                    continue
                }

                // Find or Create Category
                let category = await prisma.accreditedCategory.findFirst({
                    where: { tenantId: tid, name: categoryName }
                })

                if (!category) {
                    category = await prisma.accreditedCategory.create({
                        data: { tenantId: tid, name: categoryName }
                    })
                }

                // Upsert Persona
                // Using externalId if provided, else fallback to name for this tenant
                const existing = await prisma.accreditedPersona.findFirst({
                    where: { 
                        tenantId: tid, 
                        OR: [
                            externalId ? { externalId } : {},
                            { name }
                        ].filter(cond => Object.keys(cond).length > 0)
                    }
                })

                if (existing) {
                    await prisma.accreditedPersona.update({
                        where: { id: existing.id },
                        data: {
                            name,
                            categoryId: category.id,
                            status: status || existing.status,
                            validUntil: new Date(validUntil),
                            externalId: externalId || existing.externalId
                        }
                    })
                    results.updated++
                } else {
                    await prisma.accreditedPersona.create({
                        data: {
                            tenantId: tid,
                            name,
                            categoryId: category.id,
                            token: generate14DigitToken(),
                            status: status || 'ACTIVE',
                            validUntil: new Date(validUntil),
                            externalId: externalId
                        }
                    })
                    results.created++
                }

            } catch (err: any) {
                results.errors.push(`Erro no item ${item.name}: ${err.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                created: results.created,
                updated: results.updated,
                failed: results.errors.length
            },
            errors: results.errors
        })

    } catch (error: any) {
        console.error("[SYNC_ERROR]", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
