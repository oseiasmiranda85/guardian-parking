"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BarChart, Activity, DollarSign, Car, Users, AlertCircle, CheckCircle2, Monitor, Wifi, WifiOff } from 'lucide-react'
import FilterBar from '../components/FilterBar'

export default function Dashboard() {
    const searchParams = useSearchParams()
    // Filter States
    const [opStats, setOpStats] = useState({
        tenantName: '',
        occupancy: { current: 0, total: 0, available: 0, percentage: 0 },
        financial: { revenueToday: 0, ticketAverage: 0, byPaymentMethod: [] },
        flow: { 
            entriesToday: 0, 
            byVehicleType: [], 
            hourlyDistribution: [],
            courtesyCount: 0,
            accreditedCount: 0,
            courtesyPercentage: 0,
            courtesyThreshold: 5
        },
        exemptions: { courtesy: 0, accredited: 0, total: 0 },
        audit: { prepaidApproves: 0 }
    })
    const [divergence, setDivergence] = useState<any>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeFilters, setActiveFilters] = useState<any>(() => {
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        return {
            dateRange: 'Hoje',
            startDate: dateStr,
            endDate: dateStr
        };
    })
    const [activity, setActivity] = useState<any[]>([])
    const [tenantId, setTenantId] = useState<string | null>(null)
    const [siblingTenants, setSiblingTenants] = useState<any[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const [devices, setDevices] = useState<any[]>([])

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    React.useEffect(() => {
        const loadSiblings = async () => {
            let currentId = searchParams.get('tenantId')
            if (!currentId) {
                currentId = sessionStorage.getItem('current_tenant_id')
            }
            
            if (!currentId) return
            try {
                let ownerId = null;
                if (currentId.startsWith('ALL_')) {
                    ownerId = currentId.split('_')[1];
                } else {
                    const resTenant = await fetch(`/api/admin/tenants/${currentId}`)
                    const currentTenant = await resTenant.json()
                    ownerId = currentTenant?.ownerId
                }
                
                if (ownerId) {
                    const resSiblings = await fetch(`/api/admin/tenants?ownerId=${ownerId}`)
                    const siblingsData = await resSiblings.json()
                    if (Array.isArray(siblingsData)) {
                        setSiblingTenants(siblingsData)
                    }
                }
            } catch (err) { }
        }
        loadSiblings()
    }, [])

    React.useEffect(() => {
        let currentId = searchParams.get('tenantId')
        
        if (!currentId) {
            currentId = sessionStorage.getItem('current_tenant_id')
        }
        
        setTenantId(currentId)

        if (!currentId) return

        const loadData = () => {
            const queryParams = new URLSearchParams({
                tenantId: currentId || '',
                startDate: activeFilters.startDate || '',
                endDate: activeFilters.endDate || '',
                _t: Date.now().toString() // Cache breaker
            }).toString()

            // Fetch Operational Stats
            fetch(`/api/dashboard/operational-stats?${queryParams}`, { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    if (data.tenantName) setOpStats(data)
                })
                .catch(err => console.error(err))

            // Fetch Activity
            fetch(`/api/dashboard/activity?tenantId=${currentId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setActivity(data)
                })
                .catch(err => console.error(err))
                
            // Fetch Divergence
            fetch(`/api/dashboard/divergence?tenantId=${currentId}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) setDivergence(data)
                })
                .catch(err => console.error(err))

            // Fetch Connected Devices
            fetch(`/api/dashboard/devices?tenantId=${currentId}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.devices) setDevices(data.devices)
                })
                .catch(err => console.error(err))
        }

        // Initial Load
        loadData()

        // Refresh every 30 seconds
        const interval = setInterval(loadData, 30000)

        return () => clearInterval(interval)
    }, [activeFilters, searchParams])

    return (
        <div className="space-y-6">
            {/* Operational Header */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-red-500" />
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                            {opStats.tenantName || 'Estatísticas Operacionais'}
                        </h2>
                    </div>
                    <div className="text-gray-400 flex items-center text-sm mt-1">
                        Visão em Tempo Real
                        {siblingTenants.length > 1 && (
                            <div className="relative flex items-center ml-1" ref={dropdownRef}>
                                <span className="text-gray-500 mr-2">-</span>
                                <button 
                                    onClick={() => setShowDropdown(prev => !prev)}
                                    className="text-emerald-500 cursor-pointer hover:text-emerald-400 font-bold outline-none flex items-center"
                                >
                                    Trocar Estabelecimento ▾
                                </button>
                                
                                {showDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-stone-800 border border-stone-600 rounded-xl shadow-2xl py-2 z-[60]">
                                        <div className="px-4 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-white/5 mb-1">
                                            Suas Unidades Ativas
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            <div 
                                                onClick={() => {
                                                    const ownerId = siblingTenants[0].ownerId;
                                                    sessionStorage.setItem('current_tenant_id', `ALL_${ownerId}`)
                                                    window.location.reload()
                                                }}
                                                className={`px-4 py-3 cursor-pointer transition text-sm flex items-center gap-2 ${tenantId?.startsWith('ALL_') ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500' : 'text-gray-300 hover:bg-white/5 border-l-2 border-transparent'}`}
                                            >
                                                <div className="w-2 h-2 rounded-full bg-blue-500 opacity-50 shrink-0"></div>
                                                <span className="truncate flex-1">🌍 Visão Consolidada (Todos)</span>
                                            </div>
                                            {siblingTenants.map(t => (
                                                <div 
                                                    key={t.id} 
                                                    onClick={() => {
                                                        sessionStorage.setItem('current_tenant_id', String(t.id))
                                                        window.location.reload()
                                                    }}
                                                    className={`px-4 py-3 cursor-pointer transition text-sm flex items-center gap-2 ${String(t.id) === String(tenantId) ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500' : 'text-gray-300 hover:bg-white/5 border-l-2 border-transparent'}`}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-50 shrink-0"></div>
                                                    <span className="truncate">{t.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-4 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full text-xs font-bold animate-pulse">
                    ● SISTEMA ONLINE
                </div>
            </div>

            {/* Global Filters */}
            <div className="bg-stone-900 border border-white/5 p-4 rounded-3xl flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-10 bg-red-600 rounded-full"></div>
                    <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-1">Consolidação Operacional</span>
                        <FilterBar onFilterChange={(f) => {
                            // Clear states to show loading
                            setOpStats({
                                tenantName: '',
                                occupancy: { current: 0, total: 0, available: 0, percentage: 0 },
                                financial: { revenueToday: 0, ticketAverage: 0, byPaymentMethod: [] },
                                flow: { 
                                    entriesToday: 0, 
                                    byVehicleType: [], 
                                    hourlyDistribution: [],
                                    courtesyCount: 0,
                                    accreditedCount: 0,
                                    courtesyPercentage: 0,
                                    courtesyThreshold: 5
                                },
                                exemptions: { courtesy: 0, accredited: 0, total: 0 },
                                audit: { prepaidApproves: 0 }
                            });
                            setActiveFilters(f);
                        }} />
                    </div>
                </div>
                {activeFilters.dateRange !== 'Hoje' ? (
                    <div className="text-[10px] bg-red-600/20 text-red-500 px-4 py-2 rounded-2xl border border-red-500/30 font-black uppercase tracking-widest animate-pulse">
                        Sincronizando: {activeFilters.dateRange}
                    </div>
                ) : (
                    <div className="text-[10px] bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl border border-emerald-500/20 font-black uppercase tracking-widest">
                        Tempo Real: Hoje
                    </div>
                )}
            </div>

            {divergence && (
                <div className={`border p-6 rounded-xl flex items-center justify-between ${
                    (divergence.divergence?.alertLevel === 'HIGH' || opStats.flow.courtesyPercentage > opStats.flow.courtesyThreshold) ? 'bg-red-500/10 border-red-500' :
                    (divergence.divergence?.alertLevel === 'MEDIUM' || opStats.flow.courtesyPercentage > (opStats.flow.courtesyThreshold * 0.7)) ? 'bg-yellow-500/10 border-yellow-500' :
                    'bg-green-500/10 border-green-500/20'
                }`}>
                    <div>
                        <h3 className={`text-xl font-bold mb-2 ${
                            (divergence.divergence?.alertLevel === 'HIGH' || opStats.flow.courtesyPercentage > opStats.flow.courtesyThreshold) ? 'text-red-500' :
                            (divergence.divergence?.alertLevel === 'MEDIUM' || opStats.flow.courtesyPercentage > (opStats.flow.courtesyThreshold * 0.7)) ? 'text-yellow-500' :
                            'text-green-500'
                        }`}>
                            Auditoria Operacional {opStats.flow.courtesyPercentage > opStats.flow.courtesyThreshold ? '(ALERTA: CORTESIAS ELEVADAS)' : (divergence.divergence?.alertLevel === 'HIGH' ? '(DIVERGÊNCIA ALTA)' : '(SAUDÁVEL)')}
                        </h3>
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-300">
                            <div>Total de Entradas: <strong className="text-white">{opStats.flow.entriesToday}</strong></div>
                            <div>Pagamentos Aprovados (Pré): <strong className="text-emerald-400">{opStats.audit?.prepaidApproves?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}</strong></div>
                            <div>Cortesias: <strong className={opStats.flow.courtesyPercentage > opStats.flow.courtesyThreshold ? "text-red-400" : "text-white"}>{opStats.flow.courtesyCount} ({opStats.flow.courtesyPercentage.toFixed(1)}%)</strong></div>
                            <div>Credenciados: <strong className="text-white">{opStats.flow.accreditedCount}</strong></div>
                            <div>Divergência Pátio/Caixa: <strong className={divergence.divergence?.alertLevel === 'HIGH' ? "text-red-400" : "text-white"}>{divergence.divergence?.refundVouchers || 0} vouchers</strong></div>
                        </div>
                    </div>
                    {opStats.flow.courtesyPercentage > opStats.flow.courtesyThreshold && (
                        <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-black text-xs animate-pulse">
                            LIMITE DE {opStats.flow.courtesyThreshold}% EXCEDIDO
                        </div>
                    )}
                </div>
            )}
            {/* CONNECTED DEVICES PANEL */}
            <div className="bg-stone-900 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-400" />
                        Terminais POS
                    </h3>
                    <span className="text-[10px] text-gray-600 font-mono">
                        {devices.filter((d: any) => d.online).length}/{devices.length} online hoje
                    </span>
                </div>
                {devices.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">Nenhum terminal registrou atividade hoje. Os dispositivos aparecem automaticamente após a primeira sincronização.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {devices.map((device: any) => (
                            <div
                                key={device.deviceId}
                                className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${
                                    device.online
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-white/[0.02] border-white/5'
                                }`}
                            >
                                <div className="mt-0.5 shrink-0">
                                    {device.online ? (
                                        <div className="relative">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-60"></div>
                                        </div>
                                    ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-mono text-xs font-bold text-white truncate">{device.deviceId}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{device.name}</p>
                                    <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
                                        {new Date(device.lastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* LIVE METRICS ROW (4 Colums) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* 1. OCCUPANCY */}
                <div className="bg-stone-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Car className="w-24 h-24" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Ocupação Atual</p>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-bold text-white">{opStats.occupancy.current}</span>
                        <span className="text-xl text-gray-500 font-medium mb-1">/ {opStats.occupancy.total}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden mb-2">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${opStats.occupancy.percentage > 90 ? 'bg-red-500' :
                                opStats.occupancy.percentage > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                                }`}
                            style={{ width: `${opStats.occupancy.percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-stone-500 flex justify-between">
                        <span>{opStats.occupancy.percentage}% Ocupado</span>
                        <span className="text-emerald-500 font-bold">{opStats.occupancy.available} Livres</span>
                    </p>
                </div>

                {/* 2. REVENUE TODAY */}
                <div className="bg-stone-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-24 h-24" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Faturamento {activeFilters.dateRange}</p>
                    <h3 className="text-3xl font-bold text-emerald-400 mt-2">
                        {opStats.financial.revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <p className="text-xs text-stone-500 mt-4 flex items-center gap-1">
                        <span className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">↑ Recebido</span>
                        <span>Confirmado em conta</span>
                    </p>
                </div>

                {/* 3. INFLOW */}
                <div className="bg-stone-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Entradas {activeFilters.dateRange}</p>
                    <h3 className="text-4xl font-bold text-white mt-2">{opStats.flow.entriesToday}</h3>
                    <p className="text-xs text-stone-500 mt-4">Veículos no período</p>
                </div>

                {/* 4. RENOUNCED REVENUE (Isenções) */}
                <div className="bg-stone-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertCircle className="w-24 h-24 text-purple-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Receita Renunciada</p>
                    <h3 className="text-3xl font-bold text-purple-400 mt-2">
                        {opStats.exemptions.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <div className="text-[9px] text-stone-500 mt-4 flex flex-col gap-1">
                        <div className="flex justify-between"><span>Cortesias:</span> <span className="font-bold text-gray-300">{opStats.exemptions.courtesy.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div className="flex justify-between"><span>Credenciados:</span> <span className="font-bold text-gray-300">{opStats.exemptions.accredited.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    </div>
                </div>

            </div>

            {/* FULL WIDTH HOURLY HEATMAP */}
            <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 h-[450px] flex flex-col relative group transition-all hover:border-red-500/30 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                    <Activity className="w-64 h-64 text-red-500" />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h3 className="text-xl font-black mb-2 flex items-center gap-3 italic uppercase tracking-tighter">
                            <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                            MAPA DE CALOR: PICOS DE MOVIMENTAÇÃO ({activeFilters.dateRange})
                        </h3>
                        <p className="text-xs text-stone-500 uppercase font-bold tracking-widest text-[10px]">Intensidade de fluxo granular por hora</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-blue-500/50">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-[10px] uppercase font-black tracking-widest">Normal</span>
                        </div>
                        <div className="flex items-center gap-2 text-orange-500">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-[10px] uppercase font-black tracking-widest">Médio</span>
                        </div>
                        <div className="flex items-center gap-2 text-red-500">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-[10px] uppercase font-black tracking-widest">Pico Crítico</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-end gap-2 pb-2 px-1">
                    {opStats.flow.hourlyDistribution && opStats.flow.hourlyDistribution.length > 0 ? (
                        opStats.flow.hourlyDistribution.map((count: number, hour: number) => {
                            const maxCount = Math.max(...opStats.flow.hourlyDistribution, 1)
                            const heightPercentage = (count / maxCount) * 100

                            return (
                                <div key={hour} className="flex-1 flex flex-col items-center justify-end gap-4 group/bar relative h-full">
                                    {/* Instant Tooltip */}
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-4 py-2 rounded-2xl opacity-0 group-hover/bar:opacity-100 transition-all duration-200 z-[100] whitespace-nowrap shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-none font-black flex flex-col items-center scale-50 group-hover/bar:scale-110 origin-bottom">
                                        <div className="text-[10px] text-stone-500 uppercase">{hour.toString().padStart(2, '0')}:00h</div>
                                        <div className="text-2xl text-red-600">
                                            {count} <span className="text-[10px] text-black">veículos</span>
                                        </div>
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
                                    </div>
                                    
                                    <div className="w-full flex-1 flex flex-col justify-end">
                                        <div 
                                            className="w-full rounded-2xl transition-all duration-1000 ease-out relative group-hover/bar:brightness-150 group-hover/bar:scale-x-110"
                                            style={{ 
                                                height: `${Math.max(heightPercentage, count > 0 ? 12 : 5)}%`,
                                                backgroundColor: count === 0 ? 'rgba(255,255,255,0.03)' : `hsl(${220 - (heightPercentage * 2.2)}, 100%, 55%)`,
                                                boxShadow: count > 0 ? `0 0 30px hsl(${220 - (heightPercentage * 2.2)}, 100%, 50%, 0.3)` : 'none'
                                            }}
                                        >
                                            {count > 0 && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10"></div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <span className={`text-[12px] font-black font-mono transition-all duration-300 ${count > 0 ? 'text-gray-400 group-hover/bar:text-white' : 'text-stone-800'}`}>
                                        {hour.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            )
                        })
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Activity className="w-16 h-16 opacity-10 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-stone-600">Aguardando dados operacionais</p>
                        </div>
                    )}
                </div>
            </div>

            {/* SECONDARY ROW: Categorização e Métodos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Payment Methods */}
                <div className="bg-stone-900 border border-white/10 rounded-xl p-8 h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold flex items-center gap-3 italic uppercase tracking-[0.2em] text-emerald-500">
                            <DollarSign className="w-5 h-5" />
                            Recebimento por Método
                        </h3>
                        <Link href={`/finance${tenantId ? '?tenantId=' + tenantId : ''}`} className="text-xs text-stone-500 hover:text-white transition">
                            Relatórios detalhados →
                        </Link>
                    </div>

                    <div className="flex-1 space-y-6">
                        {opStats.financial.byPaymentMethod?.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-700 font-mono text-[10px] uppercase tracking-widest">Nenhum pagamento registrado</div>
                        ) : (
                            opStats.financial.byPaymentMethod?.map((item: any) => (
                                <div key={item.method} className="group">
                                    <div className="flex justify-between text-sm mb-2 px-1">
                                        <span className="text-gray-400 font-black uppercase tracking-widest text-[9px]">
                                            {({
                                                'CREDIT': 'Cartão de Crédito',
                                                'DEBIT': 'Cartão de Débito',
                                                'CASH': 'Dinheiro',
                                                'PIX': 'Pix',
                                                'DINHEIRO': 'Dinheiro',
                                                'CRÉDITO': 'Cartão de Crédito',
                                                'DÉBITO': 'Cartão de Débito'
                                            } as Record<string, string>)[item.method.toUpperCase()] || item.method}
                                        </span>
                                        <span className="text-white font-black group-hover:text-emerald-400 transition-colors">
                                            {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                    <div className="w-full bg-stone-800 rounded-full h-4 overflow-hidden border border-white/5 p-0.5">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-[2000ms] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                            style={{
                                                width: `${(item.total / opStats.financial.revenueToday) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 2. Vehicles Types */}
                <div className="bg-stone-900 border border-white/10 rounded-xl p-8 h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold mb-8 flex items-center gap-3 italic uppercase tracking-[0.2em] text-blue-500">
                        <Users className="w-5 h-5" />
                        Perfil da Frota
                    </h3>
                    
                    <div className="flex-1 flex items-center gap-8 px-4">
                        <div className="flex-1 space-y-4">
                            {opStats.flow.byVehicleType?.map((item: any) => {
                                const rawType = item.vehicleType || 'CAR';
                                const translatedType = ({
                                    'CAR': 'CARROS',
                                    'MOTORCYCLE': 'MOTOS',
                                    'MOTO': 'MOTOS',
                                    'VAN': 'UTILITÁRIOS',
                                    'TRUCK': 'CAMINHÕES'
                                } as Record<string, string>)[rawType] || 'CARROS';
                                
                                return (
                                    <div key={rawType} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{translatedType}</span>
                                        </div>
                                        <span className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{item._count.id}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex-none w-40 h-40 rounded-full border-[12px] border-stone-800 flex items-center justify-center relative shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                             <div className="absolute inset-0 rounded-full border-[12px] border-blue-500 border-t-transparent opacity-20 animate-spin-slow"></div>
                             <div className="text-center">
                                 <div className="text-4xl font-black">{opStats.occupancy.current}</div>
                                 <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No Pátio</div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold italic uppercase tracking-widest">Histórico de Entradas Recentes</h3>
                    <Link href={`/tickets${tenantId ? '?tenantId=' + tenantId : ''}`} className="text-xs text-stone-500 hover:text-white transition uppercase font-black tracking-widest">
                        Base Completa →
                    </Link>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-black/50 text-gray-500 font-black uppercase tracking-widest text-[10px]">
                        <tr>
                            <th className="p-4">Placa</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Horário Entrada</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Valor Atual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activity.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-600 font-mono text-xs uppercase tracking-widest italic">
                                    Nenhuma atividade registrada no período.
                                </td>
                            </tr>
                        ) : (
                            activity.map((item) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4 font-mono font-bold text-white tracking-widest text-base">{item.plate}</td>
                                    <td className="p-4 text-xs font-black uppercase tracking-widest text-gray-400">{item.type}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">{item.time}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                            item.status === 'OPEN' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                'bg-gray-500/10 text-gray-500 border border-gray-500/10'
                                            }`}>
                                            {item.status === 'PAID' ? 'PAGO' : item.status === 'OPEN' ? 'EM ABERTO' : item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
