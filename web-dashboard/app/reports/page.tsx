"use client"

import React, { useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import { Calendar, Download, Printer, Filter } from 'lucide-react'
import FilterBar from '../components/FilterBar'

export default function ReportsPage() {
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

    const [currentDate, setCurrentDate] = useState('')
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const fetchStats = () => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        setLoading(true)
        fetch(`/api/finance/stats?tenantId=${tenantId}`)
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }

    React.useEffect(() => {
        setCurrentDate(new Date().toLocaleString())
        fetchStats()
    }, [filters])

    const handlePrint = () => {
        window.print()
    }

    // Safe access
    const currentRevenueData = stats?.revenueByHour || []
    const currentPaymentMethods = stats?.paymentMethods || []
    const currentVehicleTypes = stats?.vehicleTypes || []
    const currentWeeklyFlow = stats?.weeklyFlow || []

    const kpi = stats?.kpi || { totalRevenue: 0, totalVehicles: 0, ticketAvg: 0, occupancy: 0 }

    const totalRevenue = kpi.totalRevenue
    const totalVehicles = kpi.totalVehicles
    const ticketAvg = kpi.ticketAvg

    return (
        <div className="space-y-8 print:text-black">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold">Relatórios Gerenciais</h2>
                    <p className="text-gray-400">Análise detalhada de performance e financeiro.</p>
                </div>
                <div className="flex gap-3 relative items-center">
                    <div className="mr-2">
                        <FilterBar onFilterChange={setFilters} />
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-stone-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-stone-400 transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Exportar PDF</span>
                    </button>
                </div>
            </div>

            {/* Print Header (Visible only on print) */}
            <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold">GUARDIAN PARKING</h1>
                <p className="text-sm">Relatório Geral de Operação - Período: {filters.dateRange}</p>
                <p className="text-xs mt-2">Gerado em: {currentDate}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white">
                    <h3 className="text-gray-400 text-sm mb-1 print:text-black">Receita Total</h3>
                    <p className="text-2xl font-bold text-green-500 print:text-black">
                        {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white">
                    <h3 className="text-gray-400 text-sm mb-1 print:text-black">Ticket Médio</h3>
                    <p className="text-2xl font-bold text-white print:text-black">
                        {ticketAvg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white">
                    <h3 className="text-gray-400 text-sm mb-1 print:text-black">Veículos (Total)</h3>
                    <p className="text-2xl font-bold text-white print:text-black">{totalVehicles}</p>
                </div>
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white">
                    <h3 className="text-gray-400 text-sm mb-1 print:text-black">Receita Renunciada</h3>
                    <p className="text-2xl font-bold text-purple-500 print:text-black">
                        {(kpi.renouncedRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{kpi.courtesyCount || 0} Cortesias / {kpi.accreditedCount || 0} Cred.</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">

                {/* Revenue by Hour */}
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white print:break-inside-avoid">
                    <h3 className="text-lg font-bold mb-6 print:text-black">Faturamento por Horário {filters.dateRange !== 'Hoje' && '(Média)'}</h3>
                    <div className="h-[300px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="hour" stroke="#888" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #333', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: '#333' }}
                                />
                                <Bar dataKey="amount" name="Receita (R$)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods Section */}
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white print:break-inside-avoid">
                    <h3 className="text-lg font-bold mb-6 print:text-black">Receita por Método de Pagamento</h3>
                    <div className="h-[300px] w-full flex items-center justify-center mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={currentPaymentMethods}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {currentPaymentMethods.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #333', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Table Payment Methods */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-t border-white/10 pt-4">
                            <thead className="text-gray-400 font-medium">
                                <tr>
                                    <th className="py-2">Método</th>
                                    <th className="py-2 text-center">Qtd. Transações</th>
                                    <th className="py-2 text-right">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {currentPaymentMethods.map((item: any, idx: number) => (
                                    <tr key={idx} className="print:text-black">
                                        <td className="py-2 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            {item.name}
                                        </td>
                                        <td className="py-2 text-center">{item.count}</td>
                                        <td className="py-2 text-right font-mono">
                                            {(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-bold border-t border-white/20 print:border-black print:text-black">
                                    <td className="py-3">TOTAL</td>
                                    <td className="py-3 text-center">{currentPaymentMethods.reduce((acc: number, cur: any) => acc + (cur.count || 0), 0)}</td>
                                    <td className="py-3 text-right">
                                        {currentPaymentMethods.reduce((acc: number, cur: any) => acc + (cur.value || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Vehicle Types + Weekly Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">

                {/* Vehicle Types Section */}
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white print:break-inside-avoid">
                    <h3 className="text-lg font-bold mb-6 print:text-black">Receita por Tipo de Veículo</h3>
                    <div className="h-[300px] w-full flex items-center justify-center mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={currentVehicleTypes}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {currentVehicleTypes.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #333', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Table Vehicle Types */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-t border-white/10 pt-4">
                            <thead className="text-gray-400 font-medium">
                                <tr>
                                    <th className="py-2">Tipo</th>
                                    <th className="py-2 text-center">Qtd. Veículos</th>
                                    <th className="py-2 text-right">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {currentVehicleTypes.map((item: any, idx: number) => (
                                    <tr key={idx} className="print:text-black">
                                        <td className="py-2 flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            {item.name}
                                        </td>
                                        <td className="py-2 text-center">{item.count}</td>
                                        <td className="py-2 text-right font-mono">
                                            {(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-bold border-t border-white/20 print:border-black print:text-black">
                                    <td className="py-3">TOTAL</td>
                                    <td className="py-3 text-center">{currentVehicleTypes.reduce((acc: number, cur: any) => acc + (cur.count || 0), 0)}</td>
                                    <td className="py-3 text-right">
                                        {currentVehicleTypes.reduce((acc: number, cur: any) => acc + (cur.value || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Weekly Flow Chart - Constant for now */}
                <div className="bg-stone-900 border border-white/10 p-6 rounded-xl print:border-black print:bg-white print:break-inside-avoid">
                    <h3 className="text-lg font-bold mb-6 print:text-black">Fluxo Semanal de Veículos</h3>
                    <div className="h-[300px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={currentWeeklyFlow}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="day" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #333', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="vehicles" name="Veículos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Footer Text */}
            <div className="hidden print:block text-center text-xs mt-10 border-t border-black pt-4">
                <p>Guardian Parking Systems - Documento Confidencial</p>
            </div>

            {/* Global Print Styles Injection */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        color: black !important;
                    }
                    .bg-stone-900, .bg-black {
                        background-color: white !important;
                        border-color: #000 !important;
                        color: black !important;
                    }
                    .text-white, .text-gray-400, .text-stone-500 {
                        color: black !important;
                    }
                    /* Hide sidebar and other non-print elements */
                    aside, header {
                        display: none !important;
                    }
                    main {
                        margin-left: 0 !important;
                        padding: 0 !important;
                    }
                    .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line {
                        stroke: #ccc !important;
                    }
                    .recharts-text {
                        fill: #000 !important;
                    }
                }
            `}</style>
        </div>
    )
}
