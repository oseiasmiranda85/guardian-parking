import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

const NEON_API_KEY = 'napi_s909un2q6k8la7mqjzson8epxwszh6d30x5o1304wgyxjx6fzjztuilk4ujo1yd5'
const PROJECT_ID = 'old-moon-89343538'

export async function GET() {
    try {
        // 1. Fetch Project Details
        const projectRes = await fetch(`https://console.neon.tech/api/v2/projects/${PROJECT_ID}`, {
            headers: {
                'Authorization': `Bearer ${NEON_API_KEY}`,
                'Accept': 'application/json'
            },
            next: { revalidate: 30 }
        })

        // 2. Fetch Consumption/Usage Data
        const usageRes = await fetch(`https://console.neon.tech/api/v2/projects/${PROJECT_ID}/usage`, {
            headers: {
                'Authorization': `Bearer ${NEON_API_KEY}`,
                'Accept': 'application/json'
            },
            next: { revalidate: 60 }
        })

        if (!projectRes.ok) throw new Error('Neon Project API failed')
        const projectData = await projectRes.json()
        const usageData = usageRes.ok ? await usageRes.json() : null

        // 3. Fetch REAL Active Connections from Postgres
        const pgConnections: any = await prisma.$queryRaw`SELECT count(*)::int as count FROM pg_stat_activity WHERE state = 'active'`
        const activeConnections = pgConnections[0]?.count || 0

        // 4. Fetch Active Terminals (Synced in the last 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
        const activeDevices = await prisma.device.count({
            where: {
                lastSeen: {
                    gte: fifteenMinutesAgo
                }
            }
        })

        const stats = {
            project: {
                id: PROJECT_ID,
                status: projectData.project.status,
                name: projectData.project.name,
                region: projectData.project.region_id,
                pg_version: projectData.project.pg_version,
                updated_at: projectData.project.updated_at,
                storage_bytes: projectData.project.storage_bytes || 0,
            },
            usage: usageData ? {
                compute_seconds: usageData.usage?.compute_seconds || 0,
                data_transfer_bytes: usageData.usage?.data_transfer_bytes || 0,
                written_data_bytes: usageData.usage?.written_data_bytes || 0,
                data_storage_bytes_hour: usageData.usage?.data_storage_bytes_hour || 0
            } : null,
            realtime: {
                active_connections: activeConnections,
                active_terminals: activeDevices
            }
        }

        return NextResponse.json(stats)
    } catch (error: any) {
        console.error('[NEON_FULL_STATS_ERROR]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
