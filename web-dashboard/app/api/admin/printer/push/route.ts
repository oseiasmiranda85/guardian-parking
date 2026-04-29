import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Validar se temos o tenantId
    // Nota: Em uma versão real, usaríamos o tenantId da sessão ou do header
    // Para simplificar o monitor, permitiremos passar no corpo
    const tenantId = data.tenantId || 1 // Fallback para tenant 1 se não informado

    const ticket = await prisma.virtualTicket.create({
      data: {
        tenantId: Number(tenantId),
        content: JSON.stringify(data),
        type: data.style || 'TICKET',
        deviceId: data.terminal || 'UNKNOWN'
      }
    })

    // Limpeza: manter apenas os últimos 50 tickets para não encher o banco
    const count = await prisma.virtualTicket.count({ where: { tenantId: Number(tenantId) } })
    if (count > 50) {
      const oldest = await prisma.virtualTicket.findFirst({
        where: { tenantId: Number(tenantId) },
        orderBy: { createdAt: 'asc' }
      })
      if (oldest) {
        await prisma.virtualTicket.delete({ where: { id: oldest.id } })
      }
    }

    return NextResponse.json({ success: true, id: ticket.id })
  } catch (error: any) {
    console.error('Printer push error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
