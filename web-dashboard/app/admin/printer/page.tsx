'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Printer, RefreshCcw, Trash2, ShieldAlert } from 'lucide-react'

interface VirtualTicket {
  id: string
  content: string
  type: string
  createdAt: string
  deviceId: string
}

export default function PrinterMonitor() {
  const searchParams = useSearchParams()
  const accessKey = searchParams.get('key')
  const [tickets, setTickets] = useState<VirtualTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const DEBUG_KEY = 'guardian_debug_2026' // Chave de acesso simples

  useEffect(() => {
    if (accessKey === DEBUG_KEY) {
      setAuthorized(true)
      fetchTickets()
      const interval = setInterval(fetchTickets, 3000)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [accessKey])

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/printer/list')
      const data = await res.json()
      setTickets(data)
      setLoading(false)
    } catch (e) {
      console.error(e)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Deseja limpar todo o histórico de monitoramento?')) return
    try {
      await fetch('/api/admin/printer/clear', { method: 'POST' })
      setTickets([])
    } catch (e) { console.error(e) }
  }

  if (!authorized && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground mt-2">Esta ferramenta é temporária e requer uma chave de autorização.</p>
      </div>
    )
  }

  const renderTicketContent = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr)
      return (
        <div className="flex flex-col gap-1 text-[11px] font-mono leading-tight">
          {data.steps?.map((step: any, i: number) => {
            if (step.type === 'IMAGE') return <div key={i} className="flex justify-center py-2"><Printer className="w-8 h-8 opacity-20" /></div>
            if (step.type === 'SPACE') return <div key={i} className="h-2" />
            if (step.type === 'QRCODE') return <div key={i} className="flex justify-center py-2 border border-dashed border-black/10"> [QR CODE: {step.data}] </div>
            if (step.type === 'TEXT') {
              return (
                <div 
                  key={i} 
                  className={`whitespace-pre-wrap ${step.align === 'CENTER' ? 'text-center' : 'text-left'} ${step.isBold ? 'font-bold' : ''}`}
                >
                  {step.text}
                </div>
              )
            }
            return null
          })}
        </div>
      )
    } catch (e) {
      return <pre className="text-xs">{jsonStr}</pre>
    }
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="text-primary">🤖</span> Monitor de Impressão Virtual
          </h1>
          <p className="text-muted-foreground">Os tickets gerados no terminal POS aparecem aqui em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={clearHistory}
            className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
            title="Limpar Histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Conectado
          </Badge>
          <button onClick={fetchTickets} className="p-2 hover:bg-white rounded-full transition-colors">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 italic text-muted-foreground">Carregando bobina...</div>
      ) : (
        <div className="flex overflow-x-auto gap-6 pb-8 snap-x">
          {tickets.map((t) => (
            <div key={t.id} className="snap-start min-w-[280px] max-w-[280px]">
              <div className="bg-white shadow-xl rounded-t-lg border-x border-t p-6 relative min-h-[400px]">
                {/* Paper cut effect */}
                <div className="absolute -top-1 left-0 right-0 h-1 bg-white" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }} />
                
                {renderTicketContent(t.content)}
              </div>
              <div className="bg-slate-100 border p-3 rounded-b-lg text-[10px] text-muted-foreground">
                <div className="flex justify-between font-medium">
                  <span>ID: {t.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(t.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1 opacity-70">Term: {t.deviceId}</div>
              </div>
            </div>
          ))}
          
          {tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full p-20 border-2 border-dashed rounded-xl opacity-40">
              <Printer className="w-12 h-12 mb-4" />
              <p>Nenhuma impressão detectada recentemente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
