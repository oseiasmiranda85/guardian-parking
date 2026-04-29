import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function POST(req: Request) {
  try {
    // Nota: Em uma versão real, usaríamos o tenantId da sessão
    const tenantId = 1 

    await prisma.virtualTicket.deleteMany({
      where: {
        tenantId: tenantId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
