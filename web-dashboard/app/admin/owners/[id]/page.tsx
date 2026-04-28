"use client"

import React, { useEffect, useState } from 'react'
import { User, Building, FileText, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OwnerDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [owner, setOwner] = useState<any>(null)
    const [invoices, setInvoices] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState('TENANTS')

    useEffect(() => {
        // Fetch Owner
        fetch(`/api/admin/owners/${params.id}`).then(res => res.json()).then(setOwner)
        // Fetch Invoices
        fetch(`/api/admin/invoices?ownerId=${params.id}`).then(res => res.json()).then(setInvoices)
    }, [params.id])

    if (!owner) return <div className="p-8 text-gray-500">Carregando...</div>

    return (
        <div className="space-y-6">
            <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-white mb-2 text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Lista
            </button>

            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center border border-white/10">
                    <User className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{owner.name}</h1>
                    <p className="text-gray-400">{owner.document} • {owner.email}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4">
                <button
                    onClick={() => setActiveTab('TENANTS')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${activeTab === 'TENANTS' ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    <Building className="w-4 h-4" /> Estacionamentos ({owner.tenants.length})
                </button>
                <button
                    onClick={() => setActiveTab('INVOICES')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${activeTab === 'INVOICES' ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    <FileText className="w-4 h-4" /> Faturas ({invoices.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'TENANTS' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {owner.tenants.map((t: any) => (
                        <div key={t.id} className="bg-stone-900 border border-white/10 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{t.name}</h3>
                                <p className="text-sm text-gray-400">{t.address || 'Sem endereço'}</p>
                            </div>
                            <button
                                onClick={() => router.push(`/admin/tenants/${t.id}`)}
                                className="text-sm bg-stone-800 px-3 py-1 rounded hover:bg-stone-700"
                            >
                                Detalhes
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400">
                            <tr>
                                <th className="p-4">Estacionamento</th>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {invoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-white/5">
                                    <td className="p-4 font-bold">{inv.tenant.name}</td>
                                    <td className="p-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className="p-4">R$ {inv.amount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === 'PAID' ? 'text-green-500 bg-green-500/10' :
                                                inv.status === 'OVERDUE' ? 'text-red-500 bg-red-500/10' : 'text-yellow-500 bg-yellow-500/10'
                                            }`}>{inv.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
