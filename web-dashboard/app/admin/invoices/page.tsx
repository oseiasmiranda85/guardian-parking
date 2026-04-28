"use client"

import React, { useEffect, useState } from 'react'
import { FileText, DollarSign, Plus, CheckCircle2, AlertCircle, Filter, X } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

type Invoice = {
    id: number
    tenant: { name: string }
    amount: number
    dueDate: string
    status: string
    referenceMonth?: string
    finalAmount?: number
    penalty?: number
    interest?: number
}

export default function InvoicesPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [sysConfig, setSysConfig] = useState<any>(null)
    const [tenants, setTenants] = useState<any[]>([])

    // Filter State
    const tenantIdFilter = searchParams.get('tenantId')
    const ownerIdFilter = searchParams.get('ownerId')

    // New Invoice Form
    const [newInvoice, setNewInvoice] = useState({ tenantId: '', amount: '', dueDate: '', reference: '' })

    // Payment Form
    const [showPayModal, setShowPayModal] = useState(false)
    const [paymentForm, setPaymentForm] = useState({ penalty: '', interest: '', discount: '', date: '' })

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/config', { cache: 'no-store' })
            const data = await res.json()
            setSysConfig(data)
        } catch (e) {
            console.error("Failed to load config")
        }
    }

    const fetchTenants = async () => {
        const res = await fetch('/api/admin/tenants', { cache: 'no-store' })
        const data = await res.json()
        if (Array.isArray(data)) setTenants(data)
    }

    // Month Filter State
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    })

    const [statusFilter, setStatusFilter] = useState('ALL')

    const monthOptions = React.useMemo(() => {
        const options = ['ALL']
        const date = new Date()
        for (let i = 0; i < 12; i++) {
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const y = date.getFullYear()
            options.push(`${m}/${y}`)
            date.setMonth(date.getMonth() - 1)
        }
        return options
    }, [])

    const fetchInvoices = async () => {
        setLoading(true)
        const query = new URLSearchParams()
        if (tenantIdFilter) query.set('tenantId', tenantIdFilter)
        if (ownerIdFilter) query.set('ownerId', ownerIdFilter)

        // Add Month Filter
        if (selectedMonth) query.set('month', selectedMonth)
        // Add Status Filter
        if (statusFilter && statusFilter !== 'ALL') query.set('status', statusFilter)

        const res = await fetch(`/api/admin/invoices?${query.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (Array.isArray(data)) {
            setInvoices(data)
        } else {
            console.error('API Error:', data)
            setInvoices([])
        }
        setLoading(false)
    }

    // Effect to refetch when filters change
    useEffect(() => {
        fetchInvoices()
    }, [selectedMonth, statusFilter])

    const handleCreate = async () => {
        const res = await fetch('/api/admin/invoices', {
            method: 'POST',
            body: JSON.stringify({
                tenantId: newInvoice.tenantId,
                amount: newInvoice.amount,
                dueDate: newInvoice.dueDate,
                referenceMonth: newInvoice.reference
            })
        })

        if (!res.ok) {
            alert("Erro ao criar fatura. Verifique os dados.")
            return
        }

        setShowModal(false)
        fetchInvoices()
    }

    const openPayModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice)
        const todayStr = new Date().toISOString().split('T')[0]

        let initialPenalty = ''
        let initialInterest = ''

        // Calculate Charges if Overdue and Config Loaded
        const today = new Date()
        const due = new Date(invoice.dueDate)

        if (due < today && sysConfig) {
            // Penalty (Fixed %)
            const penaltyVal = invoice.amount * (sysConfig.penaltyRate || 0)
            if (penaltyVal > 0) initialPenalty = penaltyVal.toFixed(2)

            // Interest (Monthly %)
            // Calculate months diff
            let months = (today.getFullYear() - due.getFullYear()) * 12
            months -= due.getMonth()
            months += today.getMonth()
            // Adjust if day of month is passed? Usually simple month diff is enough for MVP, 
            // or pro-rata. Let's stick to simple full month diff for now or at least 1 month if late.
            if (months < 1) months = 1 // Min 1 month interest if late? Or 0? 
            // Actually, interest is usually pro-rata or per month started.
            // Let's assume per month started.

            const interestVal = invoice.amount * (sysConfig.interestRate || 0) * months
            if (interestVal > 0) initialInterest = interestVal.toFixed(2)
        }

        setPaymentForm({
            penalty: initialPenalty,
            interest: initialInterest,
            discount: '',
            date: todayStr
        })
        setShowPayModal(true)
    }

    const confirmPayment = async () => {
        if (!selectedInvoice) return

        await fetch(`/api/admin/invoices/${selectedInvoice.id}/pay`, {
            method: 'POST',
            body: JSON.stringify({
                manualPenalty: paymentForm.penalty || undefined,
                manualInterest: paymentForm.interest || undefined,
                discount: paymentForm.discount || undefined,
                paymentDate: paymentForm.date || undefined
            })
        })
        setShowPayModal(false)
        fetchInvoices()
    }

    useEffect(() => {
        fetchConfig()
        fetchTenants()
        fetchInvoices()
    }, [tenantIdFilter, ownerIdFilter]) // Refetch when params change

    const openCreateModal = () => {
        setNewInvoice({
            ...newInvoice,
            tenantId: tenantIdFilter || '',
            amount: '',
            dueDate: '',
            reference: ''
        })
        setShowModal(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-stone-500" />
                    Gestão de Faturas
                </h2>
                <div className="flex gap-4">
                    <select
                        className="bg-stone-900 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-white/50"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        {monthOptions.map(opt => (
                            <option key={opt} value={opt}>{opt === 'ALL' ? 'Todos os Períodos' : opt}</option>
                        ))}
                    </select>

                    <select
                        className="bg-stone-900 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-white/50"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="PENDING">A Pagar (Pendente)</option>
                        <option value="PAID">Pago</option>
                        <option value="OVERDUE">Vencido</option>
                        <option value="CANCELLED">Cancelado</option>
                    </select>

                    <button
                        onClick={openCreateModal}
                        className="bg-green-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-500 transition"
                    >
                        <Plus className="w-4 h-4" /> Nova Fatura
                    </button>
                </div>
            </div>

            {/* Active Filters Banner */}
            {(tenantIdFilter || ownerIdFilter) && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400">
                        <Filter className="w-5 h-5" />
                        <span>
                            Filtrando por:
                            {tenantIdFilter && <b className="ml-1 text-white">Estacionamento ID #{tenantIdFilter}</b>}
                            {ownerIdFilter && <b className="ml-1 text-white">Owner ID #{ownerIdFilter}</b>}
                        </span>
                    </div>
                    <button
                        onClick={() => router.push('/admin/invoices')}
                        className="text-sm bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 px-3 py-1.5 rounded flex items-center gap-2 transition"
                    >
                        <X className="w-4 h-4" /> Limpar Filtros (Ver Todas)
                    </button>
                </div>
            )}

            <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/50 text-gray-400">
                        <tr>
                            <th className="p-4">Tenant</th>
                            <th className="p-4">Ref</th>
                            <th className="p-4">Vencimento</th>
                            <th className="p-4">Valor Original</th>
                            <th className="p-4">Valor Final</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500">
                                    Nenhuma fatura encontrada.
                                </td>
                            </tr>
                        ) : (
                            invoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-white/5">
                                    <td className="p-4 font-bold">{inv.tenant.name}</td>
                                    <td className="p-4 text-gray-400">{inv.referenceMonth}</td>
                                    <td className="p-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className="p-4">R$ {inv.amount.toFixed(2)}</td>
                                    <td className="p-4 font-mono text-stone-300">
                                        {inv.finalAmount ? `R$ ${inv.finalAmount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === 'PAID' ? 'bg-green-500/10 text-green-500' :
                                            inv.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500' :
                                                'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                            {
                                                {
                                                    'PAID': 'PAGO',
                                                    'PENDING': 'PENDENTE',
                                                    'OVERDUE': 'VENCIDO',
                                                    'CANCELLED': 'CANCELADO'
                                                }[inv.status] || inv.status
                                            }
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {inv.status !== 'PAID' && (
                                            <button
                                                onClick={() => openPayModal(inv)}
                                                className="text-sm bg-stone-800 hover:bg-green-900 border border-white/10 px-3 py-1 rounded transition text-green-400"
                                            >
                                                Quitar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-stone-900 p-6 rounded-xl w-96 border border-white/10 space-y-4">
                        <h3 className="text-xl font-bold">Nova Fatura</h3>

                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Estacionamento</label>
                            <select
                                className="w-full bg-black border border-white/20 p-2 rounded text-white"
                                value={newInvoice.tenantId}
                                onChange={e => setNewInvoice({ ...newInvoice, tenantId: e.target.value })}
                            >
                                <option value="">Selecione...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <input
                            placeholder="Valor (R$)"
                            type="number"
                            className="w-full bg-black border border-white/20 p-2 rounded text-white"
                            onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                        />
                        <input
                            type="date"
                            className="w-full bg-black border border-white/20 p-2 rounded text-white"
                            onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                        />
                        <input
                            placeholder="Ref (ex: 01/2026)"
                            className="w-full bg-black border border-white/20 p-2 rounded text-white"
                            onChange={e => setNewInvoice({ ...newInvoice, reference: e.target.value })}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 rounded text-white font-bold">Criar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {showPayModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-stone-900 p-6 rounded-xl w-96 border border-white/10 space-y-4">
                        <h3 className="text-xl font-bold text-green-500">Quitar Fatura</h3>
                        <p className="text-sm text-gray-400">
                            Valor Original: <span className="text-white font-bold">R$ {selectedInvoice.amount.toFixed(2)}</span>
                        </p>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold block mb-1">Data da Baixa</label>
                                <input
                                    type="date"
                                    className="w-full bg-black border border-white/20 p-2 rounded text-white text-sm"
                                    value={paymentForm.date}
                                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-bold block">Ajustes Financeiros</label>
                                <input
                                    placeholder="Multa (R$)"
                                    type="number"
                                    className="w-full bg-black border border-white/20 p-2 rounded text-white text-sm"
                                    value={paymentForm.penalty}
                                    onChange={e => setPaymentForm({ ...paymentForm, penalty: e.target.value })}
                                />
                                <input
                                    placeholder="Juros (R$)"
                                    type="number"
                                    className="w-full bg-black border border-white/20 p-2 rounded text-white text-sm"
                                    value={paymentForm.interest}
                                    onChange={e => setPaymentForm({ ...paymentForm, interest: e.target.value })}
                                />
                                <input
                                    placeholder="Desconto (R$)"
                                    type="number"
                                    className="w-full bg-black border border-white/20 p-2 rounded text-white text-sm"
                                    value={paymentForm.discount}
                                    onChange={e => setPaymentForm({ ...paymentForm, discount: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Dynamic Total */}
                        <div className="bg-white/5 p-4 rounded-lg flex justify-between items-center border border-white/10">
                            <span className="text-gray-400 font-bold uppercase text-xs">Valor Total a Pagar</span>
                            <span className="text-2xl font-bold text-green-400">
                                R$ {(
                                    selectedInvoice.amount +
                                    (parseFloat(paymentForm.penalty) || 0) +
                                    (parseFloat(paymentForm.interest) || 0) -
                                    (parseFloat(paymentForm.discount) || 0)
                                ).toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowPayModal(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                            <button onClick={confirmPayment} className="px-4 py-2 bg-green-600 rounded text-white font-bold">Confirmar Pagamento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
