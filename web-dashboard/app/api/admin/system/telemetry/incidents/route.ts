import { NextResponse } from "next/server"
import { prisma } from "@/app/lib/prisma"

export async function GET() {
    try {
        const slowEvents = await prisma.performanceTelemetry.findMany({
            where: {
                OR: [
                    { ocrTimeMs: { gt: 1000 } },
                    { totalProcessTimeMs: { gt: 5000 } },
                    { apiLatencyMs: { gt: 800 } }
                ]
            },
            include: {
                tenant: {
                    select: { name: true }
                }
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 10
        })

        return NextResponse.json(slowEvents)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 })
    }
}
