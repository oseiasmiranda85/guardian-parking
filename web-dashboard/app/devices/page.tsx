"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Monitor, RefreshCw, Smartphone, Clock, Activity, ArrowUpDown, Wifi, WifiOff } from 'lucide-react'

export default function DevicesPage() {
    const searchParams = useSearchParams()
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchDevices = async () => {
        setLoading(true)
        try {
            let tenantId = searchParams.get('tenantId') || sessionStorage.getItem('current_tenant_id')
            if (!tenantId) return

            const res = await fetch(`/api/dashboard/devices?tenantId=${tenantId}`)
            const data = await res.json()
            if (data?.devices) {
                setDevices(data.devices)
                setLastUpdated(new Date())
            }
        } catch (error) {
            console.error(error)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchDevices()
        const interval = setInterval(fetchDevices, 30000)
        return () => clearInterval(interval)
    }, [])

    const onlineCount = devices.filter(d => d.online).length

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <Monitor className="w-6 h-6 text-blue-400" />
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                            Terminais POS
                        </h2>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        Dispositivos registrados automaticamente via sincronização do App Android
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-[10px] text-gray-600 font-mono">
                            Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
                        </span>
                    )}
                    <button
                        onClick={fetchDevices}
                        className="flex items-center gap-2 bg-stone-800 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-stone-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-white">{devices.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Terminais Hoje</p>
                </div>
                <div className="bg-stone-900 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-400">{onlineCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Online (30 min)</p>
                </div>
                <div className="bg-stone-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-blue-400">
                        {devices.reduce((acc, d) => acc + d.totalOps, 0)}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Operações Hoje</p>
                </div>
            </div>

            {/* Devices Grid */}
            {loading && devices.length === 0 ? (
                <div className="py-16 text-center text-gray-600 text-sm animate-pulse">Carregando terminais...</div>
            ) : devices.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-white/10 rounded-xl">
                    <Smartphone className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Nenhum terminal registrou atividade hoje</p>
                    <p className="text-gray-600 text-sm mt-1">
                        Os dispositivos aparecem aqui automaticamente após a primeira sincronização do App Android.
                    </p>
                    <p className="text-gray-700 text-xs mt-3 font-mono">ID do terminal: POS-XXXXXXXX (gerado pelo Android ID)</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map(device => (
                        <div
                            key={device.deviceId}
                            className={`bg-stone-900/80 border rounded-xl p-6 relative overflow-hidden group transition-all ${
                                device.online
                                    ? 'border-emerald-500/20 hover:border-emerald-500/40'
                                    : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            {/* Background glow */}
                            <div className={`absolute top-0 right-0 w-32 h-32 -mt-12 -mr-12 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${
                                device.online ? 'bg-emerald-500' : 'bg-gray-500'
                            }`} />

                            {/* Header row */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                                    <Smartphone className="w-5 h-5 text-stone-400" />
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${
                                    device.online
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-white/5 text-gray-500 border-white/10'
                                }`}>
                                    {device.online ? (
                                        <>
                                            <div className="relative">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                                            </div>
                                            ONLINE
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                            OFFLINE
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Device ID */}
                            <h3 className="text-lg font-black font-mono text-white tracking-widest mb-1">
                                {device.deviceId}
                            </h3>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-5">Terminal Android POS</p>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Entradas</p>
                                    <p className="text-xl font-black text-white">{device.entryCount}</p>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Saídas</p>
                                    <p className="text-xl font-black text-white">{device.exitCount}</p>
                                </div>
                            </div>

                            {/* Last seen */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                        Último: {new Date(device.lastSeen).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                
                                {/* Toggle Control */}
                                <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                                    <span className="text-[9px] font-black uppercase text-gray-400">Ticket Saída</span>
                                    <button
                                        onClick={async () => {
                                            const newVal = !device.requireExitTicket;
                                            try {
                                                await fetch(`/api/dashboard/devices/update`, {
                                                    method: 'POST',
                                                    body: JSON.stringify({ deviceId: device.deviceId, requireExitTicket: newVal })
                                                });
                                                fetchDevices(); // Refresh
                                            } catch (e) { console.error(e) }
                                        }}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${
                                            device.requireExitTicket ? 'bg-emerald-600' : 'bg-stone-700'
                                        }`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                                            device.requireExitTicket ? 'right-1' : 'left-1'
                                        }`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
