import { NextResponse } from 'next/server'

const NEON_API_KEY = 'napi_s909un2q6k8la7mqjzson8epxwszh6d30x5o1304wgyxjx6fzjztuilk4ujo1yd5'
const PROJECT_ID = 'old-moon-89343538'

export async function GET() {
    try {
        // 1. Fetch Project Details (Status, etc.)
        const projectRes = await fetch(`https://console.neon.tech/api/v2/projects/${PROJECT_ID}`, {
            headers: {
                'Authorization': `Bearer ${NEON_API_KEY}`,
                'Accept': 'application/json'
            },
            next: { revalidate: 60 } // Cache for 1 minute
        })

        if (!projectRes.ok) throw new Error('Neon API failed')
        const projectData = await projectRes.json()

        // 2. Extract useful metrics
        // Note: usage endpoint in v2 provides more granular data if needed
        // but project data usually has basic info
        
        const stats = {
            status: projectData.project.status,
            name: projectData.project.name,
            region: projectData.project.region_id,
            pg_version: projectData.project.pg_version,
            updated_at: projectData.project.updated_at,
            // Mocking some metrics that might require usage endpoint or specific branch data
            // To be more precise, we could fetch /projects/{id}/branches/{branch_id}/endpoints
            usage: {
                storage_bytes: projectData.project.storage_bytes || 0,
                active_connections: 0, // Would need endpoint monitoring for real-time
                cpu_seconds: 0
            }
        }

        return NextResponse.json(stats)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
