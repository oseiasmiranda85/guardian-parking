"use client"

import React, { useState } from 'react'
import { Search, Ban, Eye, X, Camera, Printer, Calendar, User, CreditCard } from 'lucide-react'

// Mock Data with extended details
export default function TicketsPage() {
    const [selectedTicket, setSelectedTicket] = useState<any>(null)
    const [tickets, setTickets] = useState<any[]>([])
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL') // New state
    const [stayFilter, setStayFilter] = useState('ALL') // NEW

    // Entry Modal State
    const [showEntryModal, setShowEntryModal] = useState(false)
    const [entryStep, setEntryStep] = useState(1) // 1: Plate, 2: Details, 3: Payment
    const [entryData, setEntryData] = useState({ plate: '', vehicleType: 'CAR', helmetCount: 0, paymentMethod: 'CASH', entryMethod: 'MANUAL', ticketType: 'ROTATIVO' })
    const [obsCamera, setObsCamera] = useState(false) // Camera active?

    const [activeTable, setActiveTable] = useState<any>(null)

    // Debounce Search - REMOVED for Manual "Apply" request
    // React.useEffect(() => {
    //     const timer = setTimeout(() => setDebouncedSearch(search), 500)
    //     return () => clearTimeout(timer)
    // }, [search])

    const fetchTickets = (p = 1, q = '', s = '') => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        // Note: Added status param 's' and stay param 'stay'
        const statusParam = s && s !== 'ALL' ? `&status=${s}` : ''
        const stayParam = stayFilter && stayFilter !== 'ALL' ? `&stay=${stayFilter}` : ''

        fetch(`/api/tickets?tenantId=${tenantId}&page=${p}&limit=50&search=${q}${statusParam}${stayParam}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setTickets(data.data)
                    setPagination(data.pagination)
                }
                else if (Array.isArray(data)) {
                    setTickets(data)
                }
            })
            .catch(err => console.error(err))
    }

    // Initial Fetch
    React.useEffect(() => {
        fetchTickets(1, '', '') // Load all on start
    }, [])

    const handleApplyFilters = () => {
        setPagination({ ...pagination, page: 1 }) // Reset page
        fetchTickets(1, search, statusFilter)
    }

    React.useEffect(() => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (tenantId) {
            // Fetch Active Rules
            fetch(`/api/pricing?tenantId=${tenantId}&active=true`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) setActiveTable(data)
                })
        }
    }, [])

    const handleNewEntry = () => {
        setEntryData({ plate: '', vehicleType: 'CAR', helmetCount: 0, paymentMethod: 'CASH', entryMethod: 'MANUAL', ticketType: 'ROTATIVO' })
        setEntryStep(1)
        setShowEntryModal(true)
    }

    const handleMassExit = async () => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        if (!confirm("⚠️ ATENÇÃO: SAÍDA EM MASSA\n\nIsso irá encerrar TODOS os tickets abertos no pátio agora.\nOs valores serão zerados (Isenção/Saída Livre) ou considerados pagos.\n\nTem certeza que deseja liberar todos os veículos?")) {
            return
        }

        try {
            const res = await fetch('/api/tickets/mass-exit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            alert(data.message)
            window.location.reload()
        } catch (e: any) {
            alert("Erro: " + e.message)
        }
    }

    // Helper: Calculate Price based on Table Rules
    const getEntryPrice = (table: any) => {
        if (!table || !table.slots) return 0

        // If Fixed Time (Turno)
        if (table.type === 'FIXED_TIME') {
            const now = new Date()
            const currentMinutes = now.getHours() * 60 + now.getMinutes()

            const matchingSlot = table.slots.find((slot: any) => {
                if (!slot.startTime || !slot.endTime) return false

                const [startH, startM] = slot.startTime.split(':').map(Number)
                const [endH, endM] = slot.endTime.split(':').map(Number)

                const startTotal = startH * 60 + startM
                const endTotal = endH * 60 + endM

                if (startTotal <= endTotal) {
                    // Normal range (e.g. 08:00 - 18:00)
                    return currentMinutes >= startTotal && currentMinutes <= endTotal
                } else {
                    // Cross midnight (e.g. 20:00 - 08:00)
                    return currentMinutes >= startTotal || currentMinutes <= endTotal
                }
            })

            return matchingSlot ? matchingSlot.price : (table.slots[0]?.price || 0) // Fallback to first if no specific range matches (or assume flat)
        }

        // If Duration (Prepaid = First Hour?)
        // Usually Duration is Postpaid, but if Prepaid, maybe charge minMinutes?
        if (table.type === 'DURATION') {
            return table.slots[0]?.price || 0
        }

        return 0
    }

    const processEntry = async () => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        try {
            const isPrepaid = activeTable?.billingMode === 'PREPAID'
            const isAccredited = entryData.ticketType === 'ACCREDITED'

            let paymentPayload = { amount: 0, method: 'CASH', status: 'PENDING' }

            if (isAccredited) {
                paymentPayload = { amount: 0, method: 'CREDENTIAL', status: 'APPROVED' }
            } else if (isPrepaid) {
                const price = getEntryPrice(activeTable)

                if (price > 0 && entryData.paymentMethod !== 'CASH') {
                    const confirmed = confirm(`[POS STONE - PRÉ-PAGO]\n\nCobrar Entrada: R$ ${price.toFixed(2)}\nMétodo: ${entryData.paymentMethod}\n\nConfirmar Pagamento?`)
                    if (!confirmed) return
                }
                paymentPayload = { amount: price, method: entryData.paymentMethod, status: 'APPROVED' }
            } else {
                paymentPayload = { amount: 0, method: 'CASH', status: 'PENDING' }
            }

            const res = await fetch('/api/tickets/entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    plate: entryData.plate,
                    vehicleType: entryData.vehicleType,
                    helmetCount: entryData.helmetCount,
                    entryMethod: obsCamera ? 'OCR' : entryData.entryMethod,
                    ticketType: entryData.ticketType,
                    payment: paymentPayload
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error)
            }

            const ticket = await res.json()
            alert(`Ticket #${ticket.id} Emitido!\nPlaca: ${ticket.plate}\nModo: ${isPrepaid ? 'PRÉ-PAGO' : 'PÓS-PAGO'}\nValor: R$ ${paymentPayload.amount.toFixed(2)}`)
            setShowEntryModal(false)
            // Refresh
            window.location.reload()

        } catch (error: any) {
            alert(error.message)
        }
    }

    const handleExitConfirm = async (ticketId: number) => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        if (!confirm("Confirmar a saída física deste veículo?")) return

        try {
            const res = await fetch('/api/tickets/exit-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, tenantId })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            alert("Saída confirmada!")
            setSelectedTicket(null) // Close modal
            fetchTickets(pagination.page, search, statusFilter) // Refresh list
        } catch (e: any) {
            alert("Erro: " + e.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gestão de Tickets (POS)</h2>
                <button
                    onClick={handleNewEntry}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-900/20"
                >
                    <CreditCard className="w-5 h-5" />
                    Nova Entrada
                </button>
            </div>

            {/* Filters */}
            <div className="bg-stone-900 border border-white/10 rounded-xl p-4 flex gap-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value)
                            // Reset page on search change? Optional, but good practice
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        placeholder="Buscar por placa, ID ou transação..."
                        className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-stone-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 focus:outline-none"
                >
                    <option value="ALL">Status: Todos</option>
                    <option value="OPEN">Ativos (Pátio)</option>
                    <option value="PAID">Pagos</option>
                    <option value="EXITED">Encerrados</option>
                    <option value="CANCELLED">Cancelados</option>
                </select>
                <select
                    value={stayFilter}
                    onChange={e => setStayFilter(e.target.value)}
                    className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 focus:outline-none"
                >
                    <option value="ALL">Permanência: Todas</option>
                    <option value="IN_YARD">Somente no Pátio</option>
                    <option value="EXITED">Somente Finalizados</option>
                </select>
                <button
                    onClick={handleApplyFilters}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                >
                    Aplicar
                </button>
            </div>

            {/* Tickets Table */}
            <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Placa</th>
                            <th className="p-4">Entrada</th>
                            <th className="p-4">Permanência</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {tickets.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum ticket encontrado.</td></tr>
                        ) : tickets.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-white/5">
                                <td className="p-4 text-gray-500">#{ticket.id}</td>
                                <td className="p-4 font-mono font-bold">{ticket.plate}</td>
                                <td className="p-4">{ticket.entryTime}</td>
                                <td className="p-4 text-gray-400">{ticket.duration}</td>
                                 <td className="p-4 text-xs">
                                    <span className={`px-2 py-1 rounded-full font-bold ${
                                        (ticket.status === 'PAID' || ticket.status === 'Paid') ? 'bg-green-500/10 text-green-500' : 
                                        ticket.status === 'REFUNDED' ? 'bg-amber-500/10 text-amber-500' :
                                        (ticket.status === 'EXITED' || ticket.status === 'Closed') ? 'bg-blue-500/10 text-blue-500' : 
                                        'bg-yellow-500/10 text-yellow-500'
                                    }`}>
                                        {(ticket.status === 'PAID' || ticket.status === 'Paid') ? 'Pago' : 
                                         ticket.status === 'REFUNDED' ? 'Estornado' :
                                         (ticket.status === 'EXITED' || ticket.status === 'Closed') ? 'Saiu' : 'No Pátio'}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {(ticket.status === 'Paid' || ticket.status === 'Active') && !ticket.exitTime ? (
                                        <button
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-900/20"
                                            title="Conferir e Dar Saída">
                                            <Camera className="w-3 h-3" />
                                            Dar Saída
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="text-gray-400 hover:text-white p-2"
                                            title="Ver Detalhes">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button className="text-red-500 hover:text-red-400 p-2" title="Cancelar Ticket">
                                        <Ban className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center text-sm text-gray-400">
                <div>
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} tickets
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={pagination.page <= 1}
                        onClick={() => fetchTickets(pagination.page - 1, search, statusFilter)}
                        className="px-4 py-2 bg-stone-900 rounded-lg border border-white/10 hover:bg-stone-800 disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="flex items-center px-2">Página {pagination.page} de {pagination.totalPages}</span>
                    <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchTickets(pagination.page + 1, search, statusFilter)}
                        className="px-4 py-2 bg-stone-900 rounded-lg border border-white/10 hover:bg-stone-800 disabled:opacity-50"
                    >
                        Próxima
                    </button>
                </div>
            </div>

            {/* ENTRY MODAL */}
            {
                showEntryModal && (
                    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                                <h3 className="text-xl font-bold text-white">Nova Entrada</h3>
                                <button onClick={() => setShowEntryModal(false)}><X className="text-gray-500 hover:text-white" /></button>
                            </div>

                            {/* Step Content */}
                            <div className="p-6 flex-1 overflow-y-auto">
                                {entryStep === 1 && (
                                    <div className="space-y-6">
                                        {/* Camera/OCR Mock */}
                                        <div className="aspect-video bg-black rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center group">
                                            {obsCamera ? (
                                                <div className="absolute inset-0 bg-stone-800 flex items-center justify-center animate-pulse">
                                                    <Camera className="w-12 h-12 text-green-500" />
                                                    <span className="absolute bottom-4 text-green-500 text-xs font-mono">SIMULANDO OCR...</span>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <Camera className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                                                    <p className="text-gray-500 text-sm">Câmera Desativada</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setObsCamera(!obsCamera)}
                                                className="absolute md:top-4 md:right-4 bottom-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg backdrop-blur"
                                                title="Ligar/Desligar Câmera"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Plate Input */}
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Placa do Veículo</label>
                                            <input
                                                autoFocus
                                                value={entryData.plate}
                                                onChange={e => setEntryData({ ...entryData, plate: e.target.value.toUpperCase() })}
                                                placeholder="ABC-1234"
                                                maxLength={8}
                                                className="w-full bg-black border border-white/20 rounded-xl h-16 text-center text-3xl font-mono font-bold text-white uppercase focus:border-green-500 outline-none tracking-widest"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => {
                                                    // Mock Accredited
                                                    alert("LER QR CREDENCIADO: Funcionalidade em desenvolvimento.\nSimulando leitura...")
                                                    setEntryData({ ...entryData, plate: 'VIP-9999', vehicleType: 'CAR' })
                                                    setEntryStep(2)
                                                }}
                                                className="py-3 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500 hover:text-black font-bold text-sm transition"
                                            >
                                                Ler QR Credenciado
                                            </button>
                                            <button
                                                disabled={entryData.plate.length < 3}
                                                onClick={() => setEntryStep(2)}
                                                className="py-3 bg-white text-black rounded-lg hover:bg-gray-200 font-bold text-sm transition disabled:opacity-50"
                                            >
                                                Próximo &rarr;
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {entryStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <div className="text-4xl font-mono font-bold mb-1">{entryData.plate}</div>
                                            <p className="text-gray-500 text-sm">Confirme os detalhes do veículo</p>
                                        </div>

                                        {/* Type Selection */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setEntryData({ ...entryData, vehicleType: 'CAR', helmetCount: 0 })}
                                                className={`p-6 rounded-xl border border-white/10 flex flex-col items-center gap-2 transition ${entryData.vehicleType === 'CAR' ? 'bg-white text-black' : 'bg-black hover:bg-white/5'}`}
                                            >
                                                <span className="text-2xl">🚗</span>
                                                <span className="font-bold">Carro</span>
                                            </button>
                                            <button
                                                onClick={() => setEntryData({ ...entryData, vehicleType: 'MOTO' })}
                                                className={`p-6 rounded-xl border border-white/10 flex flex-col items-center gap-2 transition ${entryData.vehicleType === 'MOTO' ? 'bg-white text-black' : 'bg-black hover:bg-white/5'}`}
                                            >
                                                <span className="text-2xl">🏍️</span>
                                                <span className="font-bold">Moto</span>
                                            </button>
                                        </div>

                                        {/* Helmet Counter (Only Moto) */}
                                        {entryData.vehicleType === 'MOTO' && (
                                            <div className="bg-stone-800/50 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                <label className="text-xs text-stone-400 uppercase font-bold block mb-3 text-center">Quantos Capacetes?</label>
                                                <div className="flex justify-center gap-4">
                                                    {[0, 1, 2].map(count => (
                                                        <button
                                                            key={count}
                                                            onClick={() => setEntryData({ ...entryData, helmetCount: count })}
                                                            className={`w-12 h-12 rounded-full border border-white/10 font-bold flex items-center justify-center transition ${entryData.helmetCount === count ? 'bg-green-500 text-black border-green-500' : 'bg-black text-gray-400 hover:bg-white/10'}`}
                                                        >
                                                            {count}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setEntryStep(3)}
                                            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-900/20"
                                        >
                                            Ir para Pagamento
                                        </button>
                                    </div>
                                )}

                                {entryStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-6">
                                            <h4 className="text-xl font-bold text-white">
                                                {activeTable?.billingMode === 'PREPAID' ? 'Pagamento Antecipado' : 'Emissão de Ticket'}
                                            </h4>
                                            <p className="text-gray-500 text-sm">
                                                {activeTable?.billingMode === 'PREPAID'
                                                    ? 'Este estacionamento opera como PRÉ-PAGO. Receba o valor agora.'
                                                    : 'Este estacionamento opera como PÓS-PAGO. O pagamento será na saída.'}
                                            </p>
                                        </div>

                                        {/* Show Payment Options ONLY if PREPAID or Accredited (technically accredited is auto-approved 0) */}
                                        {activeTable?.billingMode === 'PREPAID' && entryData.ticketType === 'ROTATIVO' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'CASH', label: 'Dinheiro', icon: '💵' },
                                                        { id: 'CREDIT', label: 'Crédito', icon: '💳' },
                                                        { id: 'DEBIT', label: 'Débito', icon: '💳' },
                                                        { id: 'PIX', label: 'Pix', icon: '💠' },
                                                    ].map(m => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => setEntryData({ ...entryData, paymentMethod: m.id })}
                                                            className={`p-4 rounded-xl border flex items-center justify-between transition ${entryData.paymentMethod === m.id
                                                                ? 'bg-green-500/10 border-green-500 text-green-500'
                                                                : 'bg-black border-white/10 hover:bg-white/5 text-gray-300'}`}
                                                        >
                                                            <span className="font-bold">{m.label}</span>
                                                            <span>{m.icon}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="bg-stone-950 p-4 rounded-lg border border-white/5 text-center">
                                                    {entryData.paymentMethod === 'CASH' ? (
                                                        <p className="text-yellow-500 text-sm">⚠️ Receba o valor e emita o ticket.</p>
                                                    ) : (
                                                        <p className="text-blue-400 text-sm">ℹ️ Será enviado para o POS Stone.</p>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <button
                                            onClick={processEntry}
                                            className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                                        >
                                            <Printer className="w-5 h-5" />
                                            {activeTable?.billingMode === 'PREPAID' ? 'Receber e Emitir' : 'Imprimir Ticket'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Detail Modal */}
            {
                selectedTicket && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-900 border border-white/10 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">

                            {/* Left: Photo & Visuals */}
                            <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-white/10 bg-black/20">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-stone-500" />
                                    Registro Visual
                                </h3>
                                <div className="aspect-video bg-black rounded-lg border border-white/10 overflow-hidden relative mb-4">
                                    {/* Simulated Image from URL */}
                                    {selectedTicket.photoUrl ? (
                                        <img 
                                            src={selectedTicket.photoUrl} 
                                            alt={`Foto da Placa ${selectedTicket.plate}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-stone-950 p-4 text-center">
                                            <Camera className="w-8 h-8 mb-2 opacity-20" />
                                            <span className="text-xs uppercase font-bold tracking-widest">[SEM FOTO REGISTRADA]</span>
                                            <span className="text-[10px] opacity-50 mt-1">Placa: {selectedTicket.plate}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                        <span className="text-xs text-gray-500 block mb-1">Equipamento Entrada</span>
                                        <span className="font-mono text-sm text-green-400">{selectedTicket.entryEquipment || 'POS'}</span>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                        <span className="text-xs text-gray-500 block mb-1">Equipamento Saída</span>
                                        <span className={`font-mono text-sm ${selectedTicket.exitEquipment ? 'text-amber-400' : 'text-gray-600 italic'}`}>
                                            {selectedTicket.exitEquipment || 'Aguardando...'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Data & Logs */}
                            <div className="w-full md:w-1/2 p-6 relative">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <h3 className="text-xl font-bold mb-6 text-stone-500">Detalhes do Ticket #{selectedTicket.id}</h3>

                                <div className="space-y-6">
                                    {/* Timeline */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Linha do Tempo
                                        </h4>
                                        <div className="pl-2 border-l-2 border-white/10 space-y-4">
                                            <div className="relative pl-4">
                                                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-green-500 border-2 border-stone-900"></div>
                                                <p className="text-sm font-medium text-white">Entrada Registrada</p>
                                                <p className="text-xs text-gray-500">{selectedTicket.entryTime} • {selectedTicket.entryOperator}</p>
                                            </div>
                                            {selectedTicket.exitTime ? (
                                                <div className="relative pl-4">
                                                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-stone-900 ${
                                                        selectedTicket.status === 'REFUNDED' ? 'bg-amber-500' : 'bg-blue-500'
                                                    }`}></div>
                                                    <p className="text-sm font-medium text-white">
                                                        {selectedTicket.status === 'REFUNDED' ? 'Saída (Estorno/Tolerância)' : 'Saída Confirmada'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{selectedTicket.exitTime} • {selectedTicket.exitOperator}</p>
                                                </div>
                                            ) : (
                                                <div className="relative pl-4">
                                                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-gray-500 border-2 border-stone-900"></div>
                                                    <p className="text-sm font-medium text-gray-400">Aguardando Saída...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Financial */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4" /> Pagamento
                                        </h4>
                                        <div className="bg-black border border-white/10 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-400 text-sm">Valor Total</span>
                                                <span className="text-xl font-bold text-green-500">{selectedTicket.payment.amount}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Método</span>
                                                <span className="font-medium bg-white/10 px-2 py-1 rounded">{selectedTicket.payment.method}</span>
                                            </div>
                                            {selectedTicket.payment.txId && (
                                                <div className="flex justify-between items-center text-sm mt-1">
                                                    <span className="text-gray-500">Stone ID</span>
                                                    <span className="font-mono text-xs text-gray-400">{selectedTicket.payment.txId}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button className="flex-1 bg-stone-500 text-black font-bold py-3 rounded-lg hover:bg-stone-400 flex items-center justify-center gap-2">
                                        <Printer className="w-4 h-4" /> Imprimir 2ª Via
                                    </button>
                                    {(selectedTicket.status === 'Active' || selectedTicket.status === 'Paid') && !selectedTicket.exitTime && (
                                        <>
                                            <button
                                                onClick={() => handleExitConfirm(selectedTicket.id)}
                                                className="px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition flex items-center gap-2 shadow-lg shadow-blue-900/20"
                                                title="Confirmar Saída Física"
                                            >
                                                <Camera className="w-5 h-5" />
                                                <span>Confirmar Saída</span>
                                            </button>
                                            <button className="px-4 border border-red-500/50 text-red-500 font-bold rounded-lg hover:bg-red-500 hover:text-white transition" title="Cancelar Ticket">
                                                <Ban className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
