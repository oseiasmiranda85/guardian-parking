"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Monitor, RefreshCw, Smartphone, Clock, Activity } from 'lucide-react'

export default function DevicesPage() {
    const searchParams = useSearchParams()
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [selectedDevice, setSelectedDevice] = useState<any>(null)
    const [saving, setSaving] = useState(false)

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

    const updateDeviceConfig = async (deviceId: string, updates: any) => {
        setSaving(true)
        try {
            await fetch(`/api/dashboard/devices/update`, {
                method: 'POST',
                body: JSON.stringify({ deviceId, ...updates })
            });
            fetchDevices(); // Refresh
            if (selectedDevice) {
                setSelectedDevice((prev: any) => ({ ...prev, ...updates }))
            }
        } catch (e) { console.error(e) }
        setSaving(false)
    }

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
                        Gerenciamento remoto e configurações de atendimento dos terminais
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
                        className="flex items-center gap-2 bg-stone-800 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition text-sm text-white"
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
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Online (10 min)</p>
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
                            {/* Header row */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="p-3 bg-black/50 rounded-lg border border-white/5">
                                    <Smartphone className="w-5 h-5 text-stone-400" />
                                </div>
                                <button 
                                    onClick={() => setSelectedDevice(device)}
                                    className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg border border-white/10 text-white transition-colors"
                                >
                                    <Activity className="w-4 h-4" />
                                </button>
                            </div>

                            <h3 className="text-lg font-black font-mono text-white tracking-widest mb-1">
                                {device.deviceId}
                            </h3>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-5">Terminal Android POS</p>

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

                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-4 border-t border-white/5">
                                <span className={device.online ? 'text-emerald-400 font-bold' : 'text-gray-600'}>
                                    {device.online ? '• ONLINE' : '• OFFLINE'}
                                </span>
                                <span>
                                    Último: {new Date(device.lastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Config Modal */}
            {selectedDevice && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div>
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Configurações de Atendimento</h3>
                                <p className="text-[10px] text-blue-400 font-mono mt-0.5">TERMINAL: {selectedDevice.deviceId}</p>
                            </div>
                            <button onClick={() => setSelectedDevice(null)} className="text-gray-500 hover:text-white">X</button>
                        </div>
                        
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            
                            <ConfigToggle 
                                label="Saída Automática (Ticket Pago)"
                                description="Libera o veículo instantaneamente ao ler um ticket já quitado."
                                checked={selectedDevice.autoRelease}
                                onChange={(val: boolean) => updateDeviceConfig(selectedDevice.deviceId, { autoRelease: val })}
                                disabled={saving}
                            />

                            <ConfigToggle 
                                label="Imprimir Ticket de Saída"
                                description="Emite o comprovante térmico obrigatoriamente na saída."
                                checked={selectedDevice.requireExitTicket}
                                onChange={(val: boolean) => updateDeviceConfig(selectedDevice.deviceId, { requireExitTicket: val })}
                                disabled={saving}
                            />

                            <div className="border-t border-white/5 pt-6">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-4">Layout do Ticket</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => updateDeviceConfig(selectedDevice.deviceId, { ticketLayout: 'FULL' })}
                                        className={`p-3 rounded-lg border text-left transition-all ${selectedDevice.ticketLayout === 'FULL' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                                    >
                                        <p className="text-[11px] font-bold text-white">COMPLETO</p>
                                        <p className="text-[9px] text-gray-500">Logo e detalhes</p>
                                    </button>
                                    <button 
                                        onClick={() => updateDeviceConfig(selectedDevice.deviceId, { ticketLayout: 'COMPACT' })}
                                        className={`p-3 rounded-lg border text-left transition-all ${selectedDevice.ticketLayout === 'COMPACT' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                                    >
                                        <p className="text-[11px] font-bold text-white">ECONÔMICO</p>
                                        <p className="text-[9px] text-gray-500">Menos papel</p>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                                <ConfigToggle 
                                    label="Foto na Entrada"
                                    description="Obrigatório"
                                    checked={selectedDevice.requireEntryPhoto}
                                    onChange={(val: boolean) => updateDeviceConfig(selectedDevice.deviceId, { requireEntryPhoto: val })}
                                    disabled={saving}
                                    small
                                />
                                <ConfigToggle 
                                    label="Foto na Saída"
                                    description="Obrigatório"
                                    checked={selectedDevice.requireExitPhoto}
                                    onChange={(val: boolean) => updateDeviceConfig(selectedDevice.deviceId, { requireExitPhoto: val })}
                                    disabled={saving}
                                    small
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-black/40 border-t border-white/5 flex justify-end">
                            <button 
                                onClick={() => setSelectedDevice(null)}
                                className="bg-white text-black px-8 py-2 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ConfigToggle({ label, description, checked, onChange, disabled, small = false }: any) {
    return (
        <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex-1">
                <p className={`${small ? 'text-[11px]' : 'text-sm'} font-bold text-white`}>{label}</p>
                <p className="text-[10px] text-gray-500">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${
                    checked ? 'bg-blue-600' : 'bg-stone-800'
                }`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    checked ? 'right-1' : 'left-1'
                }`} />
            </button>
        </div>
    )
}
