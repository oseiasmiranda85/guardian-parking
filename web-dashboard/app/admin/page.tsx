"use client"

import React from 'react'
import { Building, Users, DollarSign, Activity, AlertTriangle } from 'lucide-react'

// Mock Platform Data
const PLATFORM_STATS = {
    totalTenants: 12,
    activeTenants: 10,
    blockedTenants: 2,
    totalRevenue: 45000.00, // Platform MRR
    totalOwners: 8
}

const RECENT_TENANTS = [
    { id: 1, name: 'Estacionamento Central', owner: 'Grupo Alpha', status: 'ACTIVE', plan: 'R$ 299/mês' },
    { id: 2, name: 'Shopping Plaza', owner: 'Shopping Plaza Ltda', status: 'ACTIVE', plan: 'R$ 899/mês' },
    { id: 3, name: 'Festival de Verão', owner: 'Eventos BR', status: 'BLOCKED', plan: 'Taxa Única' },
    { id: 4, name: 'Hospital São Lucas', owner: 'Saúde Corp', status: 'PENDING', plan: 'R$ 499/mês' },
]

export default function AdminDashboard() {
    const [stats, setStats] = React.useState({
        totalTenants: 0,
        activeTenants: 0,
        blockedTenants: 0,
        totalRevenue: 0,
        received: 0,
        pending: 0,
        totalOwners: 0
    })
    const [recentTenants, setRecentTenants] = React.useState<any[]>([])

    const [selectedMonth, setSelectedMonth] = React.useState(() => {
        const now = new Date()
        return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    })
    const [customStart, setCustomStart] = React.useState('')
    const [customEnd, setCustomEnd] = React.useState('')

    const monthOptions = React.useMemo(() => {
        const options = ['ALL', 'CUSTOM'] // Special keys
        const date = new Date()
        for (let i = 0; i < 12; i++) {
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const y = date.getFullYear()
            options.push(`${m}/${y}`)
            date.setMonth(date.getMonth() - 1)
        }
        return options
    }, [])

    const getLabel = (opt: string) => {
        if (opt === 'ALL') return 'Todos (Geral)'
        if (opt === 'CUSTOM') return 'Personalizado'
        return opt
    }

    React.useEffect(() => {
        let qs = `month=${selectedMonth}`
        if (selectedMonth === 'CUSTOM' && customStart && customEnd) {
            qs += `&startDate=${customStart}&endDate=${customEnd}`
        }

        // Avoid fetching if custom is selected but dates are empty
        if (selectedMonth === 'CUSTOM' && (!customStart || !customEnd)) return

        fetch(`/api/admin/stats?${qs}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.stats) setStats(data.stats)
                if (data.recentTenants) setRecentTenants(data.recentTenants)
            })
    }, [selectedMonth, customStart, customEnd])

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Visão Geral da Plataforma</h1>
                    <p className="text-gray-400">Monitoramento de todos os contratos e estacionamentos.</p>
                </div>

                {/* Filters Group */}
                <div className="flex gap-2 items-center flex-wrap">
                    {/* Period Selector */}
                    <div className="bg-stone-900 border border-white/10 rounded-lg p-1 flex items-center">
                        <span className="text-gray-500 text-sm font-bold px-3">Período:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-black text-white text-sm font-bold py-2 px-4 rounded border-none outline-none cursor-pointer hover:bg-white/10 transition"
                        >
                            {monthOptions.map(opt => (
                                <option key={opt} value={opt}>{getLabel(opt)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Range Inputs */}
                    {selectedMonth === 'CUSTOM' && (
                        <div className="flex items-center gap-2 bg-stone-900 border border-white/10 rounded-lg p-1 animate-in fade-in slide-in-from-right-4">
                            <input
                                type="date"
                                className="bg-black text-white text-xs p-2 rounded outline-none"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                className="bg-black text-white text-xs p-2 rounded outline-none"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Financial Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">MRR (Faturamento)</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </h3>
                            <span className="text-xs text-gray-500">Meta do Mês</span>
                        </div>
                        <DollarSign className="text-blue-500 bg-blue-500/10 p-2 rounded w-8 h-8" />
                    </div>
                </div>

                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">Total Recebido</p>
                            <h3 className="text-2xl font-bold text-green-500 mt-1">
                                {stats.received?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                            </h3>
                            <span className="text-xs text-green-500/80">Em Caixa</span>
                        </div>
                        <Activity className="text-green-500 bg-green-500/10 p-2 rounded w-8 h-8" />
                    </div>
                </div>

                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">A Receber</p>
                            <h3 className="text-2xl font-bold text-yellow-500 mt-1">
                                {stats.pending?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                            </h3>
                            <span className="text-xs text-yellow-500/80">Pendente</span>
                        </div>
                        <AlertTriangle className="text-yellow-500 bg-yellow-500/10 p-2 rounded w-8 h-8" />
                    </div>
                </div>
            </div>

            {/* Operational Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">Estacionamentos</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {stats.activeTenants} <span className="text-sm text-gray-500 font-normal">/ {stats.totalTenants}</span>
                            </h3>
                        </div>
                        <Building className="text-stone-500 bg-stone-500/10 p-2 rounded w-8 h-8" />
                    </div>
                </div>

                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold">Proprietários</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalOwners}</h3>
                        </div>
                        <Users className="text-purple-500 bg-purple-500/10 p-2 rounded w-8 h-8" />
                    </div>
                </div>

                <div className="bg-stone-900 border border-red-900/40 p-6 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-red-400 text-xs uppercase font-bold">Inadimplentes</p>
                            <h3 className="text-2xl font-bold text-red-500 mt-1">{stats.blockedTenants}</h3>
                        </div>
                        <AlertTriangle className="text-red-500 bg-red-500/10 p-2 rounded w-8 h-8" />
                    </div>
                </div>
            </div>

            {/* Recent Tenants List */}
            <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold">Clientes Recentes</h3>
                    <a href="/admin/tenants" className="text-xs text-blue-400 hover:text-blue-300 font-bold">Ver Todos</a>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-4">Estacionamento (Tenant)</th>
                            <th className="p-4">Proprietário (Owner)</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {recentTenants.map(tenant => (
                            <tr key={tenant.id} className="hover:bg-white/5">
                                <td className="p-4 font-medium text-white">{tenant.name}</td>
                                <td className="p-4 text-gray-400">{tenant.owner}</td>
                                <td className="p-4 text-gray-400">{tenant.plan}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${tenant.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' :
                                        tenant.status === 'BLOCKED' ? 'bg-red-500/20 text-red-500' :
                                            'bg-yellow-500/20 text-yellow-500'
                                        }`}>
                                        {{
                                            'ACTIVE': 'ATIVO',
                                            'BLOCKED': 'BLOQUEADO',
                                            'PENDING': 'PENDENTE'
                                        }[tenant.status as string] || tenant.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <a href={`/admin/tenants/${tenant.id}`} className="text-gray-400 hover:text-white">Gerenciar</a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
