import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    // Para depuração, se não passar tenantId, retornamos os últimos 50 de TODOS os tenants
    const whereClause = tenantId ? { tenantId: Number(tenantId) } : {}

    const tickets = await prisma.virtualTicket.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json(tickets)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
