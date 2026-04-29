import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId') || '1'

    const tickets = await prisma.virtualTicket.findMany({
      where: {
        tenantId: Number(tenantId)
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json(tickets)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
