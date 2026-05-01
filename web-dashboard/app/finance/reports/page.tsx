"use client"
import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, Calendar, Clock, User, Printer, Lock, CheckCircle, AlertCircle } from 'lucide-react'

// Cash Sessions (Z-Reports) Manager
// We use a state to allow "Closing" updates
function CashReportsContent() {
    const searchParams = useSearchParams()
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [filterOperator, setFilterOperator] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [filterStatus, setFilterStatus] = useState('ALL') // ALL, OPEN, CLOSED
    
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [printingSession, setPrintingSession] = useState<any>(null)

    // Load User and Data
    useEffect(() => {
        const session = localStorage.getItem('guardian_session')
        let tenantId = searchParams.get('tenantId')
        
        if (!tenantId) {
            tenantId = sessionStorage.getItem('current_tenant_id')
        }

        if (session) {
            setCurrentUser(JSON.parse(session))
        }

        if (tenantId) {
            setLoading(true)
            setFetchError(null)
            // Bust cache with timestamp
            fetch(`/api/finance/reports?tenantId=${tenantId}&_t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    console.log('[REPORTS] Received data:', data)
                    if (data.error) {
                        setFetchError(data.error)
                        setSessions([])
                    } else if (Array.isArray(data)) {
                        setSessions(data)
                    } else {
                        setFetchError('Formato de dados inválido recebido do servidor.')
                    }
                })
                .catch(err => {
                    console.error('[REPORTS] Fetch error:', err)
                    setFetchError('Erro ao conectar com o servidor.')
                })
                .finally(() => setLoading(false))
        }
    }, [searchParams])

    // Handle Closing Session (Manager Only)
    const handleCloseSession = async (id: string) => {
        const role = currentUser?.user?.role || currentUser?.role
        if (role !== 'MANAGER' && role !== 'MASTER') {
            alert('Apenas Gerentes ou Master podem realizar o fechamento de caixa pelo sistema Web.')
            return
        }

        if (confirm(`Confirma o fechamento remoto do caixa ${id}?`)) {
            try {
                const res = await fetch(`/api/finance/sessions/${id}/close`, {
                    method: 'POST'
                })

                if (res.ok) {
                    setSessions(prev => prev.map(s =>
                        s.id === id
                            ? { ...s, status: 'CLOSED', closeTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
                            : s
                    ))
                    alert(`Caixa ${id} fechado com sucesso!`)
                } else {
                    const data = await res.json()
                    alert('Erro ao fechar caixa: ' + data.error)
                }
            } catch (error) {
                console.error(error)
                alert('Erro de conexão ao tentar fechar o caixa.')
            }
        }
    }

    // Handle Printing
    const handlePrint = (session: any) => {
        setPrintingSession(session)
        // Wait for state update then print
        setTimeout(() => {
            window.print()
            // Reset after print dialog closes (simulated delay, usually dialog blocks JS)
            // We keep it set for a moment or clear it if needed. 
            // In a real app we might use a separate hidden component always rendered but fed data.
        }, 100)
    }

    const filteredSessions = sessions.filter(session => {
        const matchOperator = session.operator.toLowerCase().includes(filterOperator.toLowerCase())

        let matchDate = true
        if (startDate && endDate) {
            matchDate = session.date >= startDate && session.date <= endDate
        } else if (startDate) {
            matchDate = session.date >= startDate
        } else if (endDate) {
            matchDate = session.date <= endDate
        }

        const matchStatus = filterStatus === 'ALL' ? true : session.status === filterStatus
        return matchOperator && matchDate && matchStatus
    })

    return (
        <div className="space-y-6">
            {/* Screen Content - Hidden whilst printing */}
            <div className="print:hidden space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Relatórios de Fechamento (Z-Report)</h2>
                        <p className="text-gray-400 mt-1">
                            Histórico de sessões de caixa e fechamentos realizados nos terminais POS.
                        </p>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-stone-900 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end md:items-center">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Operador</label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar operador..."
                                className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                                value={filterOperator}
                                onChange={(e) => setFilterOperator(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">De</label>
                            <input
                                type="date"
                                className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Até</label>
                            <input
                                type="date"
                                className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Status</label>
                        <select
                            className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 transition min-w-[140px]"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">Todos</option>
                            <option value="OPEN">Aberto</option>
                            <option value="CLOSED">Fechado</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {loading && (
                        <div className="text-center py-12 flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400">Buscando sessões de caixa...</p>
                        </div>
                    )}

                    {fetchError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-xl text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-white font-bold mb-2">Erro ao carregar relatórios</h3>
                            <p className="text-red-400 text-sm mb-4">{fetchError}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {!loading && !fetchError && filteredSessions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-stone-900/50 rounded-xl border border-dashed border-white/5">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Nenhum relatório de caixa encontrado para este pátio.</p>
                        </div>
                    ) : !loading && !fetchError && (
                        filteredSessions.map((session) => (
                            <div key={session.id} className="bg-stone-900 border border-white/10 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-stone-800/50 transition">

                                {/* Left Info */}
                                <div className="flex items-center gap-6 flex-1">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${session.status === 'OPEN' ? 'bg-green-500/10 text-green-500' : 'bg-stone-800 text-stone-400'
                                        }`}>
                                        <FileText className="w-6 h-6" />
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            {session.id}
                                            <span className="text-stone-500 font-normal text-sm ml-2">| {session.tenantName}</span>
                                            {session.status === 'OPEN' ? (
                                                <span className="text-xs bg-green-500 text-black px-2 py-0.5 rounded font-bold">ABERTO</span>
                                            ) : (
                                                <span className="text-xs bg-stone-700 text-stone-300 px-2 py-0.5 rounded font-bold">FECHADO</span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {session.operator}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.date} • {session.openTime} - {session.closeTime || '...'}</span>
                                            <span className="uppercase text-stone-500 font-bold text-xs border border-stone-700 px-1 rounded">{session.terminal}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Stats & Actions */}
                                <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8 w-full md:w-auto">
                                    <div className="text-right mr-4 border-l border-white/5 pl-4 hidden md:block">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Isenções</p>
                                        <p className="text-sm font-bold text-purple-400">
                                            {session.courtesyCount || 0} Cort.
                                        </p>
                                    </div>
                                    <div className="text-right mr-4">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Total Arrecadado</p>
                                        <p className="text-2xl font-bold text-green-500">
                                            R$ {session.totalCash.toFixed(2)}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        {session.status === 'OPEN' && (
                                            <button
                                                onClick={() => handleCloseSession(session.id)}
                                                className={`p-2 rounded-lg transition border border-white/10 ${(currentUser?.user?.role === 'MANAGER' || currentUser?.user?.role === 'MASTER' || currentUser?.role === 'MANAGER' || currentUser?.role === 'MASTER') ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'opacity-30 cursor-not-allowed'}`}
                                                title={(currentUser?.user?.role === 'MANAGER' || currentUser?.user?.role === 'MASTER' || currentUser?.role === 'MANAGER' || currentUser?.role === 'MASTER') ? "Fechar Caixa" : "Apenas Gerentes podem fechar caixa"}
                                            >
                                                <Lock className="w-5 h-5" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handlePrint(session)}
                                            className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition border border-white/10 text-white"
                                            title="Imprimir Comprovante"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PRINT ONLY SECTION - Professional A4 Layout */}
            {printingSession && (
                <div className="print-container hidden print:block text-black bg-white font-sans leading-tight">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-stone-300 pb-2 mb-3">
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-stone-900">{printingSession.tenantName}</h1>
                            <p className="text-[10px] text-stone-500 font-medium">{printingSession.tenantAddress || 'Gestão Inteligente de Pátios e Eventos'}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-base font-bold text-stone-800 uppercase tracking-tight">Fechamento de Caixa</h2>
                            <p className="text-[9px] text-stone-500 italic">Emissão: {new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-3 bg-stone-50 p-3 rounded-lg border border-stone-100">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Sessão ID</p>
                            <p className="text-[10px] font-mono font-bold text-stone-800">{printingSession.id}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Operador</p>
                            <p className="text-[10px] font-bold text-stone-800 uppercase">{printingSession.operator}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                            <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Período</p>
                            <p className="text-[10px] font-bold text-stone-800">{printingSession.openTime} às {printingSession.closeTime || 'Em Aberto'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Left Column: Payments */}
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-1.5 mb-2 border-b border-stone-100 pb-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    <h3 className="text-[10px] font-bold text-stone-800 uppercase">Resumo Financeiro</h3>
                                </div>
                                <table className="w-full text-[10px]">
                                    <thead>
                                        <tr className="text-stone-400 border-b border-stone-100">
                                            <th className="text-left py-1">Método</th>
                                            <th className="text-center py-1">Qtd</th>
                                            <th className="text-right py-1">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        <tr className="font-bold">
                                            <td className="py-1.5">Dinheiro</td>
                                            <td className="py-1.5 text-center">{printingSession.paymentBreakdown?.cash?.count || 0}</td>
                                            <td className="py-1.5 text-right">R$ {(printingSession.paymentBreakdown?.cash?.total || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr className="text-stone-600">
                                            <td className="py-1">Cartão Crédito</td>
                                            <td className="py-1 text-center">{printingSession.paymentBreakdown?.credit?.count || 0}</td>
                                            <td className="py-1 text-right">R$ {(printingSession.paymentBreakdown?.credit?.total || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr className="text-stone-600">
                                            <td className="py-1">Cartão Débito</td>
                                            <td className="py-1 text-center">{printingSession.paymentBreakdown?.debit?.count || 0}</td>
                                            <td className="py-1 text-right">R$ {(printingSession.paymentBreakdown?.debit?.total || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr className="text-stone-600">
                                            <td className="py-1">PIX / Transf.</td>
                                            <td className="py-1 text-center">{printingSession.paymentBreakdown?.pix?.count || 0}</td>
                                            <td className="py-1 text-right">R$ {(printingSession.paymentBreakdown?.pix?.total || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr className="bg-stone-900 text-white font-black">
                                            <td className="py-2 px-2 rounded-l uppercase text-[9px]">TOTAL GERAL</td>
                                            <td className="py-2 text-center text-[10px]">{(printingSession.paymentBreakdown?.cash?.count || 0) + (printingSession.paymentBreakdown?.credit?.count || 0) + (printingSession.paymentBreakdown?.debit?.count || 0) + (printingSession.paymentBreakdown?.pix?.count || 0)}</td>
                                            <td className="py-2 text-right text-[10px] pr-2 rounded-r">R$ {(printingSession.totalCash || 0).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Column: Operation */}
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-1.5 mb-2 border-b border-stone-100 pb-1">
                                    <Calendar className="w-3.5 h-3.5 text-stone-600" />
                                    <h3 className="text-[10px] font-bold text-stone-800 uppercase">Resumo por Veículo</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {(printingSession.vehicleTypeBreakdown || []).map((v: any) => (
                                        <div key={v.type} className="flex justify-between items-center p-2 border border-stone-100 rounded bg-stone-50/50">
                                            <span className="text-[9px] font-bold text-stone-700 uppercase">{v.type}</span>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-stone-900">R$ {(v.total || 0).toFixed(2)}</p>
                                                <p className="text-[8px] text-stone-500 font-bold uppercase">{v.count || 0} Und</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-1 border-b border-blue-100 pb-1">
                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                    <h3 className="text-[10px] font-bold text-blue-800 uppercase">Credenciados</h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] font-bold text-blue-400 uppercase">Total Acessos</p>
                                        <p className="text-lg font-black text-blue-700">{printingSession.accreditedCount || 0}</p>
                                    </div>
                                    <p className="text-[8px] font-bold text-blue-500 italic">Mensalistas</p>
                                </div>
                            </div>

                            <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-1 border-b border-purple-100 pb-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                                    <h3 className="text-[10px] font-bold text-purple-800 uppercase">Cortesias</h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] font-bold text-purple-400 uppercase">Total Emitido</p>
                                        <p className="text-lg font-black text-purple-700">{printingSession.courtesyCount || 0}</p>
                                    </div>
                                    <p className="text-[8px] font-bold text-purple-500 italic">Isenções</p>
                                </div>
                            </div>

                            <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-1 border-b border-red-100 pb-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                    <h3 className="text-[10px] font-bold text-red-800 uppercase">Estornos</h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] font-bold text-red-400 uppercase">Total Cancelado</p>
                                        <p className="text-lg font-black text-red-700">R$ {(printingSession.cancelledSummary?.total || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-bold text-red-400 uppercase">Qtd</p>
                                        <p className="text-base font-bold text-red-800">{printingSession.cancelledSummary?.count || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-2 border-t border-stone-100 flex justify-between items-center text-stone-400 text-[8px]">
                        <div className="font-bold uppercase">
                            Guardian Parking System • Auditoria Financeira
                        </div>
                        <div className="italic">
                            Responsável: __________________________________________
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CashReportsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando relatórios...</div>}>
            <CashReportsContent />
        </Suspense>
    )
}
