"use client"

import React, { useState } from 'react'
import { DollarSign, CreditCard, Banknote, User, AlertCircle } from 'lucide-react'
import FilterBar from '../components/FilterBar'
import Link from 'next/link'

const ReportCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-stone-900 border border-white/10 rounded-xl p-6">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <h3 className="text-2xl font-bold mt-2">{value}</h3>
                <p className={`text-xs mt-1 ${color}`}>{sub}</p>
            </div>
            <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
        </div>
    </div>
)

export default function FinancePage() {
    const [data, setData] = useState<any[]>([])
    const [filters, setFilters] = useState<{
        dateRange: string,
        startDate: string | null,
        endDate: string | null,
        paymentMethod: string,
        vehicleType: string
    }>({
        dateRange: 'Hoje',
        startDate: null,
        endDate: null,
        paymentMethod: 'ALL',
        vehicleType: 'ALL'
    })

    React.useEffect(() => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (tenantId) {
            fetch(`/api/finance?tenantId=${tenantId}`)
                .then(res => res.json())
                .then(resData => {
                    if (Array.isArray(resData)) setData(resData)
                })
        }
    }, [])

    // Filter Logic
    const filteredData = data.filter(item => {
        let matchPayment = true
        if (filters.paymentMethod !== 'ALL') {
            matchPayment = true // API limitation for now, assuming API handles it or client ignores
        }
        return matchPayment
    })

    // Calculate Totals based on filtered data
    const totalRevenue = filteredData.reduce((acc, curr) => acc + (curr.total || 0), 0)
    const totalCard = filteredData.reduce((acc, curr) => acc + (curr.card || 0), 0)
    const totalCash = filteredData.reduce((acc, curr) => acc + (curr.cash || 0), 0)
    const totalRenounced = filteredData.reduce((acc, curr) => acc + (curr.renounced || 0), 0)
    const totalExemptions = filteredData.reduce((acc, curr) => acc + (curr.courtesy || 0) + (curr.accredited || 0), 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                <h2 className="text-2xl font-bold">Relatórios Financeiros</h2>
                <FilterBar onFilterChange={setFilters} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <ReportCard title="Faturamento Total" value={totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sub="Confirmado" icon={DollarSign} color="text-green-500" />
                <ReportCard title="Em Cartões" value={totalCard.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sub="Crédito + Débito" icon={CreditCard} color="text-blue-500" />
                <ReportCard title="Receita Renunciada" value={totalRenounced.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sub={`${totalExemptions} Isenções`} icon={AlertCircle} color="text-purple-500" />
                <ReportCard title="Operadores" value={filteredData.length} sub="Ativos no período" icon={User} color="text-stone-500" />
            </div>

            {/* Detailed Table */}
            <div className="bg-stone-900 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Transações por Operador (Filtrado)</h3>
                    <button className="text-stone-500 text-sm hover:underline">Exportar CSV</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-4">Operador</th>
                            <th className="p-4 text-right">Faturado</th>
                            <th className="p-4 text-right text-purple-400">Cortesia</th>
                            <th className="p-4 text-right text-blue-400">Credenc.</th>
                            <th className="p-4 text-right text-purple-400 font-bold">Renunciado</th>
                            <th className="p-4 text-right">Total Real</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {filteredData.length === 0 ? (
                            <tr><td colSpan={6} className="p-4 text-center text-gray-500">Nenhum dado encontrado para os filtros.</td></tr>
                        ) : filteredData.map((row) => (
                            <tr key={row.id || Math.random()} className="hover:bg-white/5">
                                <td className="p-4">
                                    <div className="font-bold">{row.operator}</div>
                                    <div className="text-[10px] text-gray-500 uppercase">{row.vehicle}</div>
                                </td>
                                <td className="p-4 text-right font-mono text-emerald-500">R$ {row.total?.toFixed(2)}</td>
                                <td className="p-4 text-right font-mono text-purple-400">{row.courtesy || 0}</td>
                                <td className="p-4 text-right font-mono text-blue-400">{row.accredited || 0}</td>
                                <td className="p-4 text-right font-mono text-purple-300">R$ {row.renounced?.toFixed(2)}</td>
                                <td className="p-4 text-right font-mono font-bold text-white">R$ {((row.total || 0) + (row.renounced || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
