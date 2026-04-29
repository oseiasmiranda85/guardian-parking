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
        <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
        <p className="text-slate-600 mt-2 font-medium">Esta ferramenta é temporária e requer uma chave de autorização.</p>
      </div>
    )
  }

  const renderTicketContent = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr)
      return (
        <div className="flex flex-col gap-1 text-[11px] font-mono leading-tight text-[#000000] [!important]">
          {data.steps?.map((step: any, i: number) => {
            if (step.type === 'IMAGE') {
              const src = step.base64 === 'LOGO' 
                ? 'https://raw.githubusercontent.com/oseiasmiranda85/guardian-parking/main/web-dashboard/public/logo-guardian.png' // URL do seu logo se existir
                : step.base64
              
              return (
                <div key={i} className="flex justify-center py-2">
                  <img src={src} className={`${step.fullWidth ? 'w-full' : 'w-24'} h-auto object-contain bg-slate-50`} alt="Ticket Image" />
                </div>
              )
            }
            if (step.type === 'SPACE') return <div key={i} className="h-2" />
            if (step.type === 'QRCODE') {
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(step.data)}`
              return (
                <div key={i} className="flex flex-col items-center justify-center py-4 gap-2">
                  <img src={qrUrl} className="w-32 h-32 border-4 border-white shadow-sm" alt="QR Code" />
                  <span className="text-[9px] opacity-50">{step.data}</span>
                </div>
              )
            }
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
      return <pre className="text-xs text-red-600 font-bold">{jsonStr}</pre>
    }
  }

  return (
    <div className="p-8 bg-[#f1f5f9] min-h-screen text-[#0f172a] [!important]">
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2 text-[#1e40af] [!important]">
            <span>🤖</span> Monitor de Impressão Virtual
          </h1>
          <p className="text-[#475569] font-medium [!important]">Os tickets gerados no terminal POS aparecem aqui em tempo real.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={clearHistory}
            className="p-2.5 bg-white hover:bg-red-100 text-red-600 rounded-lg border-2 border-red-100 shadow-md transition-all"
            title="Limpar Histórico"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 rounded-lg text-xs font-black bg-green-600 text-white shadow-lg">
            ONLINE
          </div>
          <button 
            onClick={fetchTickets} 
            className="p-2.5 bg-white hover:bg-blue-100 text-blue-700 rounded-lg border-2 border-blue-100 shadow-md transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 italic text-[#64748b] font-bold text-xl [!important]">Carregando bobina...</div>
      ) : (
        <div className="flex overflow-x-auto gap-8 pb-12 snap-x max-w-full mx-auto px-4">
          {tickets.map((t) => (
            <div key={t.id} className="snap-start min-w-[320px] max-w-[320px] transition-transform hover:-translate-y-2">
              <div className="bg-[#ffffff] shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-t-2xl border-x-2 border-t-2 border-slate-200 p-10 relative min-h-[500px]">
                <div className="absolute -top-1 left-0 right-0 h-1 bg-white" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }} />
                {renderTicketContent(t.content)}
              </div>
              <div className="bg-slate-800 border-x-2 border-b-2 border-slate-800 p-5 rounded-b-2xl shadow-2xl">
                <div className="flex justify-between font-black text-white border-b border-slate-600 pb-3 mb-3 text-[11px]">
                  <span>ID: {t.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 text-[10px]">
                  <span className="font-bold">TERMINAL:</span>
                  <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">{t.deviceId}</span>
                </div>
              </div>
            </div>
          ))}
          
          {tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full p-32 border-4 border-dashed border-slate-300 rounded-3xl bg-white/50 shadow-inner">
              <Printer className="w-20 h-20 mb-6 text-slate-300" />
              <p className="text-slate-500 text-xl font-bold">Aguardando primeira impressão...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PrinterMonitor() {
  return (
    <Suspense fallback={<div className="p-12 text-center italic font-bold">Carregando Monitor...</div>}>
      <MonitorContent />
    </Suspense>
  )
}
