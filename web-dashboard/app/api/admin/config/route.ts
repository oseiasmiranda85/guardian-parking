import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
    try {
        let config = await prisma.sysConfig.findUnique({
            where: { id: "GLOBAL" }
        })

        if (!config) {
            config = await prisma.sysConfig.create({
                data: { id: "GLOBAL" }
            })
        }

        return NextResponse.json(config)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { blockToleranceDays, penaltyRate, interestRate } = body

        const config = await prisma.sysConfig.upsert({
            where: { id: "GLOBAL" },
            update: {
                blockToleranceDays: parseInt(blockToleranceDays),
                penaltyRate: parseFloat(penaltyRate),
                interestRate: parseFloat(interestRate)
            },
            create: {
                id: "GLOBAL",
                blockToleranceDays: parseInt(blockToleranceDays),
                penaltyRate: parseFloat(penaltyRate),
                interestRate: parseFloat(interestRate)
            }
        })

        return NextResponse.json(config)
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
