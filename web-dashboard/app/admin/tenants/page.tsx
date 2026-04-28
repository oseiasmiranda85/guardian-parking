"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, MoreHorizontal, Power, Lock, ExternalLink, Edit, Trash2 } from 'lucide-react'

export default function TenantsPage() {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [tenants, setTenants] = useState<any[]>([])
    
    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null)
    const [deletePassword, setDeletePassword] = useState('')

    useEffect(() => {
        const sessionStr = localStorage.getItem('guardian_session')
        const token = sessionStr ? JSON.parse(sessionStr).token : ''

        fetch('/api/admin/tenants', { 
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTenants(data)
            })
    }, [])

    const toggleStatus = async (id: number, currentStatus: string | undefined) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
        const confirmMsg = newStatus === 'BLOCKED'
            ? 'Deseja bloquear este estacionamento? O acesso será revogado.'
            : 'Deseja liberar o acesso deste estacionamento?'

        if (!confirm(confirmMsg)) return

        const sessionStr = localStorage.getItem('guardian_session')
        const token = sessionStr ? JSON.parse(sessionStr).token : ''

        await fetch(`/api/admin/tenants/${id}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        })

        // Refresh
        fetch('/api/admin/tenants', { 
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setTenants(data) })
    }

    const handleAccess = (id: number) => {
        console.log("Admin accessing tenant", id)
        sessionStorage.setItem('current_tenant_id', String(id))
        window.open('/dashboard', '_blank')
    }

    const handleDelete = async () => {
        if (!showDeleteModal) return
        if (!deletePassword) return alert("Digite a senha master.")

        try {
            const sessionStr = localStorage.getItem('guardian_session')
            const token = sessionStr ? JSON.parse(sessionStr).token : ''

            const res = await fetch(`/api/admin/tenants/${showDeleteModal}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: deletePassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao deletar")
            
            alert("Estacionamento excluído com sucesso!")
            setShowDeleteModal(null)
            setDeletePassword('')
            
            // Refresh
            fetch('/api/admin/tenants', { 
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(r => r.json())
                .then(d => { if (Array.isArray(d)) setTenants(d) })
                
        } catch (error: any) {
            alert(error.message)
        }
    }

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.owner.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Gerenciar Estacionamentos (Tenants)</h1>
                    <p className="text-gray-400">Controle de acesso e assinaturas.</p>
                </div>
                <Link
                    href="/admin/tenants/new"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                >
                    <Plus className="w-4 h-4" />
                    Novo Cliente
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-[#0a0a0a] border border-white/10 px-4 h-12 rounded-xl focus-within:border-red-600 transition-all shadow-inner">
                <Search className="w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou proprietário..."
                    className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-zinc-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-4">Estacionamento</th>
                            <th className="p-4">Proprietário</th>
                            <th className="p-4">Contrato</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {filteredTenants.map(tenant => (
                            <tr key={tenant.id} className="hover:bg-white/5 group transition">
                                <td className="p-4">
                                    <div className="font-bold text-white mb-0.5">{tenant.name}</div>
                                    <div className="text-xs text-gray-500 font-mono">ID: #{tenant.id}</div>
                                </td>
                                <td className="p-4 text-gray-300">{tenant.owner?.name || 'N/A'}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-white/5 rounded text-xs border border-white/10 whitespace-nowrap">
                                        {tenant.subscription?.type === 'RECURRING_MONTHLY' ? 'Assinatura' : 'Evento'}
                                    </span>
                                </td>
                                <td className="p-4 text-green-400 font-mono">
                                    {tenant.subscription?.value
                                        ? tenant.subscription.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                        : 'R$ 0,00'
                                    }
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold inline-block min-w-[80px] ${tenant.subscription?.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' :
                                        tenant.subscription?.status === 'BLOCKED' ? 'bg-red-500/20 text-red-500' :
                                            'bg-yellow-500/20 text-yellow-500'
                                        }`}>
                                        {{
                                            'ACTIVE': 'ATIVO',
                                            'BLOCKED': 'BLOQUEADO',
                                            'PENDING': 'PENDENTE',
                                            'CANCELLED': 'CANCELADO'
                                        }[tenant.subscription?.status as string] || 'PENDENTE'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* Access Button */}
                                        <button
                                            onClick={() => handleAccess(tenant.id)}
                                            className="p-2 hover:bg-stone-700 text-gray-400 hover:text-white rounded transition tooltip"
                                            title="Acessar Painel"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>

                                        {/* Block/Unblock */}
                                        {tenant.subscription?.status === 'ACTIVE' ? (
                                            <button
                                                onClick={() => toggleStatus(tenant.id, tenant.subscription?.status)}
                                                className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded transition"
                                                title="Bloquear"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => toggleStatus(tenant.id, tenant.subscription?.status)}
                                                className="p-2 hover:bg-green-500/20 text-gray-400 hover:text-green-500 rounded transition"
                                                title="Liberar"
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Edit Details */}
                                        <Link
                                            href={`/admin/tenants/${tenant.id}`}
                                            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded transition"
                                            title="Editar Detalhes"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Link>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => setShowDeleteModal(tenant.id)}
                                            className="p-2 hover:bg-red-900/40 text-gray-400 hover:text-red-500 rounded transition"
                                            title="Excluir Definitivamente"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Modal */}
            {showDeleteModal !== null && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-red-900/50 p-6 rounded-2xl w-full max-w-md shadow-2xl shadow-red-900/20">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <Trash2 className="w-8 h-8" />
                            <h2 className="text-xl font-bold">Excluir Estacionamento</h2>
                        </div>
                        <p className="text-gray-300 text-sm mb-6">
                            Você está prestes a <strong className="text-white">DESTRUIR DEFINITIVAMENTE</strong> este estacionamento e TODOS os dados atrelados (tickets, financeiro, faturas, caixas). Essa ação não pode ser desfeita.
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Senha Master</label>
                                <input 
                                    type="password"
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                                    placeholder="Digite sua senha para confirmar"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    onClick={() => { setShowDeleteModal(null); setDeletePassword(''); }}
                                    className="px-4 py-2 hover:bg-white/5 rounded-lg text-gray-400 font-bold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition"
                                >
                                    Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
