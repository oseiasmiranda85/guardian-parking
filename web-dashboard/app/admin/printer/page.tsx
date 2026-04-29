'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer, RefreshCcw, Trash2, ShieldAlert } from 'lucide-react'

interface VirtualTicket {
  id: string
  content: string
  type: string
  createdAt: string
  deviceId: string
}

function MonitorContent() {
  const searchParams = useSearchParams()
  const accessKey = searchParams.get('key')
  const [tickets, setTickets] = useState<VirtualTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const DEBUG_KEY = 'guardian_debug_2026'

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
      if (Array.isArray(data)) {
        setTickets(data)
      }
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
        <div className="flex flex-col gap-1 text-[11px] font-mono leading-tight text-slate-950">
          {data.steps?.map((step: any, i: number) => {
            if (step.type === 'IMAGE') return <div key={i} className="flex justify-center py-2"><Printer className="w-8 h-8 text-slate-300" /></div>
            if (step.type === 'SPACE') return <div key={i} className="h-2" />
            if (step.type === 'QRCODE') return <div key={i} className="flex justify-center py-2 border border-dashed border-slate-200 bg-slate-50"> [QR CODE: {step.data}] </div>
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
      return <pre className="text-xs text-red-500">{jsonStr}</pre>
    }
  }

  return (
    <div className="p-8 bg-slate-100 min-h-screen text-slate-900">
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-700">
            <span>🤖</span> Monitor de Impressão Virtual
          </h1>
          <p className="text-slate-600">Os tickets gerados no terminal POS aparecem aqui em tempo real.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={clearHistory}
            className="p-2.5 bg-white hover:bg-red-50 text-red-500 rounded-lg border shadow-sm transition-all"
            title="Limpar Histórico"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-sm">
            ONLINE
          </div>
          <button 
            onClick={fetchTickets} 
            className="p-2.5 bg-white hover:bg-blue-50 text-blue-600 rounded-lg border shadow-sm transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 italic text-slate-500">Carregando bobina...</div>
      ) : (
        <div className="flex overflow-x-auto gap-8 pb-8 snap-x max-w-full mx-auto px-4">
          {tickets.map((t) => (
            <div key={t.id} className="snap-start min-w-[300px] max-w-[300px] transition-transform hover:-translate-y-1">
              <div className="bg-white shadow-2xl rounded-t-xl border-x border-t p-8 relative min-h-[450px]">
                {/* Paper cut effect */}
                <div className="absolute -top-1 left-0 right-0 h-1 bg-white" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }} />
                
                {renderTicketContent(t.content)}
              </div>
              <div className="bg-white border-x border-b p-4 rounded-b-xl text-[10px] shadow-lg">
                <div className="flex justify-between font-bold text-slate-500 border-b pb-2 mb-2">
                  <span>ID: {t.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center opacity-80 text-slate-400">
                  <span>TERMINAL:</span>
                  <span className="font-mono">{t.deviceId}</span>
                </div>
              </div>
            </div>
          ))}
          
          {tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full p-20 border-2 border-dashed rounded-xl opacity-40">
              <Printer className="w-12 h-12 mb-4 text-slate-400" />
              <p className="text-slate-500">Nenhuma impressão detectada recentemente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PrinterMonitor() {
  return (
    <Suspense fallback={<div className="p-12 text-center italic">Carregando Monitor...</div>}>
      <MonitorContent />
    </Suspense>
  )
}
