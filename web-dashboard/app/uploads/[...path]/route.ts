
import { readFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET(
    request: Request,
    { params }: { params: { path: string[] } }
) {
    try {
        const filePath = params.path.join('/')
        const fullPath = path.join(process.cwd(), 'storage', 'uploads', filePath)
        
        const data = await readFile(fullPath)
        
        return new Response(data, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        })
    } catch (e) {
        return new Response('Image not found', { status: 404 })
    }
}
