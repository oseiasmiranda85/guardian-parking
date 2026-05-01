import { NextResponse } from "next/server"
import { prisma } from "@/app/lib/prisma"

export async function GET() {
    try {
        const stats = await prisma.performanceTelemetry.aggregate({
            _avg: {
                ocrTimeMs: true,
                captureTimeMs: true,
                totalProcessTimeMs: true,
                apiLatencyMs: true
            },
            _count: {
                id: true
            }
        })

        // Recent events for trend (last 24h)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentStats = await prisma.performanceTelemetry.aggregate({
            where: {
                timestamp: {
                    gte: last24h
                }
            },
            _avg: {
                ocrTimeMs: true,
                captureTimeMs: true,
                totalProcessTimeMs: true,
                apiLatencyMs: true
            }
        })

        return NextResponse.json({
            overall: {
                avgOcr: Math.round(stats._avg.ocrTimeMs || 0),
                avgCapture: Math.round(stats._avg.captureTimeMs || 0),
                avgTotal: Math.round(stats._avg.totalProcessTimeMs || 0),
                avgApi: Math.round(stats._avg.apiLatencyMs || 0),
                totalEvents: stats._count.id
            },
            recent: {
                avgOcr: Math.round(recentStats._avg.ocrTimeMs || 0),
                avgCapture: Math.round(recentStats._avg.captureTimeMs || 0),
                avgTotal: Math.round(recentStats._avg.totalProcessTimeMs || 0),
                avgApi: Math.round(recentStats._avg.apiLatencyMs || 0)
            }
        })
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch telemetry stats" }, { status: 500 })
    }
}
