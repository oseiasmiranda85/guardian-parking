import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: Request) {
  try {
    const { deviceId, requireExitTicket } = await req.json()

    if (!deviceId) {
      return NextResponse.json({ error: 'DeviceId obrigatório' }, { status: 400 })
    }

    await prisma.device.updateMany({
      where: { posId: deviceId },
      data: { requireExitTicket }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
