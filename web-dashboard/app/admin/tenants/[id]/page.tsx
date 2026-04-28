"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, Shield, Activity, DollarSign, Lock, Power, Save, ArrowLeft, History } from 'lucide-react'

export default function TenantDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [tenant, setTenant] = useState<any>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)

    React.useEffect(() => {
        const fetchTenant = async () => {
            try {
                const res = await fetch(`/api/admin/tenants/${params.id}`, { cache: 'no-store' })
                if (!res.ok) throw new Error('Failed')
                const data = await res.json()
                setTenant(data)
            } catch (error) {
                console.error(error)
                alert("Erro ao carregar dados.")
            } finally {
                setLoading(false)
            }
        }
        fetchTenant()
    }, [params.id])

    // Update Status
    const handleToggleStatus = async () => {
        if (!tenant) return
        const currentStatus = tenant.subscription?.status
        const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'

        if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return

        try {
            await fetch(`/api/admin/tenants/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            // Update local state
            setTenant({
                ...tenant,
                subscription: { ...tenant.subscription, status: newStatus }
            })
        } catch (error) {
            alert("Erro ao atualizar.")
        }
    }

    const [errorMsg, setErrorMsg] = useState('')

    const handleSave = async () => {
        setErrorMsg('')
        try {
            const payload = {
                name: tenant.name,
                address: tenant.address,
                planType: tenant.subscription?.type,
                planValue: tenant.subscription?.value,
                latitude: tenant.latitude,
                longitude: tenant.longitude
            }
            console.log("Sending Patch:", payload)

            const res = await fetch(`/api/admin/tenants/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha desconhecida ao salvar')
            }

            alert("Dados Atualizados! Faturas pendentes recalculadas com sucesso.")
            setIsEditing(false)
        } catch (error: any) {
            console.error(error)
            setErrorMsg(error.message)
        }
    }

    const handleGeocode = async () => {
        if (!tenant.address) {
            alert('Digite o endereço primeiro.')
            return
        }
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(tenant.address)}`)
            const data = await res.json()
            if (data && data.length > 0) {
                setTenant((prev: any) => ({
                    ...prev,
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon)
                }))
                alert('Localizado com sucesso!')
            } else {
                alert('Local não encontrado.')
            }
        } catch (error) {
            console.error(error)
            alert('Falha na busca de coordenadas.')
        }
    }

    if (loading) return <div className="text-white">Carregando...</div>
    if (!tenant) return <div className="text-white">Estacionamento não encontrado.</div>

    return (
        <div className="space-y-8">
            <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-white mb-2 text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Lista
            </button>

            {/* Error Banner */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl flex items-center justify-between">
                    <span>Erro: {errorMsg}</span>
                    <button onClick={() => setErrorMsg('')} className="text-white hover:text-gray-300 font-bold">X</button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-stone-800 rounded-xl flex items-center justify-center border border-white/10">
                        <Building className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                className="bg-black text-3xl font-bold border border-white/10 rounded p-2 mb-2 w-full"
                                value={tenant.name}
                                onChange={e => setTenant({ ...tenant, name: e.target.value })}
                            />
                        ) : (
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                {tenant.name}
                                <span className={`text-xs px-2 py-1 rounded bg-stone-800 border ${tenant.subscription?.status === 'ACTIVE' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'
                                    }`}>
                                    {tenant.subscription?.status || 'PENDING'}
                                </span>
                            </h1>
                        )}
                        <p className="text-gray-400">Proprietário: <a href={`/admin/owners/${tenant.owner?.id}`} target="_blank" rel="noopener noreferrer" className="text-white font-bold underline cursor-pointer hover:text-red-400 transition">{tenant.owner?.name}</a></p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleToggleStatus}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition ${tenant.subscription?.status === 'ACTIVE'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white'
                            : 'bg-green-500/10 text-green-500 border border-green-500/50 hover:bg-green-500 hover:text-white'
                            }`}
                    >
                        {tenant.subscription?.status === 'ACTIVE' ? (
                            <>
                                <Lock className="w-4 h-4" /> Bloquear Acesso
                            </>
                        ) : (
                            <>
                                <Power className="w-4 h-4" /> Liberar Acesso
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition"
                    >
                        {isEditing ? 'Cancelar' : 'Editar Dados'}
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-stone-900 border border-white/10 p-6 rounded-xl">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Activity className="text-blue-500" /> Detalhes Operacionais
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="text-xs text-gray-500 uppercase">Endereço</label>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tenant.address || ''}
                                            onChange={(e) => setTenant({ ...tenant, address: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded p-2 mt-1"
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleGeocode}
                                            className="px-4 mt-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded font-bold transition text-xs"
                                        >
                                            📍 Buscar
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-gray-200">{tenant.address || 'Não informado'}</p>
                                )}
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500 uppercase">Latitude</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={tenant.latitude || ''}
                                        onChange={(e) => setTenant({ ...tenant, latitude: parseFloat(e.target.value) })}
                                        className="w-full bg-black border border-white/10 rounded p-2 mt-1"
                                    />
                                ) : (
                                    <p className="text-gray-200">{tenant.latitude || 'N/A'}</p>
                                )}
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500 uppercase">Longitude</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={tenant.longitude || ''}
                                        onChange={(e) => setTenant({ ...tenant, longitude: parseFloat(e.target.value) })}
                                        className="w-full bg-black border border-white/10 rounded p-2 mt-1"
                                    />
                                ) : (
                                    <p className="text-gray-200">{tenant.longitude || 'N/A'}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-gray-500 uppercase">Data de Cadastro</label>
                                <p className="text-gray-200">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info (Financial) */}
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-red-900/40 p-6 rounded-xl">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
                            <DollarSign /> Assinatura
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Plano</span>
                                {isEditing ? (
                                    <select
                                        className="bg-black text-white text-sm border border-white/10 rounded p-1"
                                        value={tenant.subscription?.type}
                                        onChange={e => setTenant({ ...tenant, subscription: { ...tenant.subscription, type: e.target.value } })}
                                    >
                                        <option value="RECURRING_MONTHLY">Mensal</option>
                                        <option value="ONE_TIME">Evento</option>
                                    </select>
                                ) : (
                                    <span className="font-bold bg-white/10 px-2 py-1 rounded text-sm">
                                        {tenant.subscription?.type === 'RECURRING_MONTHLY' ? 'Mensal' : 'Evento'}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Valor</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-32 bg-black text-white text-right border border-white/10 rounded p-1"
                                        value={tenant.subscription?.value ? tenant.subscription.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                                        onChange={e => {
                                            // Currency Mask Logic
                                            const rawValue = e.target.value.replace(/\D/g, '')
                                            const floatValue = parseInt(rawValue || '0') / 100
                                            setTenant({ ...tenant, subscription: { ...tenant.subscription, value: floatValue } })
                                        }}
                                    />
                                ) : (
                                    <span className="font-bold text-xl text-green-500">
                                        {tenant.subscription?.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                <span className="text-gray-400 text-sm">Válido Até</span>
                                <span className="text-white">
                                    {tenant.subscription?.validUntil ? new Date(tenant.subscription.validUntil).toLocaleDateString('pt-BR') : 'Indeterminado'}
                                </span>
                            </div>

                            {!isEditing && (
                                <button
                                    onClick={() => router.push(`/admin/invoices?tenantId=${params.id}`)}
                                    className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded py-2 text-sm font-bold transition">
                                    Gerenciar Faturas
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="space-y-2">
                            <button
                                onClick={handleSave}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition"
                            >
                                <Save className="w-4 h-4" /> Salvar Alterações
                            </button>
                            <p className="text-xs text-center text-gray-500">
                                *Atualizar o valor recalculará automaticamente todas as faturas pendentes.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
