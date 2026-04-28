import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
    try {
        // Authenticate
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Parse Multipart
        const formData = await request.formData()
        const file = formData.get('file') as File
        const ticketId = formData.get('ticketId') as string
        const tenantId = formData.get('tenantId') as string
        const uuid = formData.get('uuid') as string
        const plate = formData.get('plate') as string
        const entryTime = formData.get('entryTime') as string

        if (!file || !tenantId) {
            return NextResponse.json({ error: 'Missing file or tenantId' }, { status: 400 })
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure Directory Exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId)
        await mkdir(uploadDir, { recursive: true })

        // Save File
        // Filename: [uuid].jpg (Cleaner and unique)
        const filename = uuid ? `${uuid}.jpg` : `${plate}_${entryTime}.jpg`
        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, buffer)

        // Web Accessible URL
        const webPath = `/uploads/${tenantId}/${filename}`

        // Update DB
        if (uuid) {
            await prisma.ticket.update({
                where: { localId: uuid },
                data: { photoUrl: webPath }
            })
        } else {
            // Fallback for older app versions
            const entryDate = new Date(parseInt(entryTime))
            await prisma.ticket.updateMany({
                where: { 
                    plate: plate,
                    tenantId: parseInt(tenantId),
                    entryTime: {
                        gte: new Date(entryDate.getTime() - 1000),
                        lte: new Date(entryDate.getTime() + 1000)
                    }
                },
                data: { photoUrl: webPath }
            })
        }

        return NextResponse.json({ success: true, path: webPath })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
