"use client"
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
    Save, 
    Zap, 
    Printer, 
    Layout, 
    AlertCircle,
    CheckCircle2,
    RefreshCcw
} from 'lucide-react'

export default function AttendanceSettings() {
    const searchParams = useSearchParams()
    const tenantId = searchParams.get('tenantId') || typeof window !== 'undefined' ? sessionStorage.getItem('current_tenant_id') : null
    
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    const [settings, setSettings] = useState({
        globalAutoRelease: false,
        globalRequireExitTicket: true,
        defaultTicketLayout: 'FULL'
    })

    useEffect(() => {
        if (tenantId) {
            fetchSettings()
        }
    }, [tenantId])

    const fetchSettings = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/dashboard/tenant/settings?tenantId=${tenantId}`)
            const data = await res.json()
            if (data.id) {
                setSettings({
                    globalAutoRelease: data.globalAutoRelease,
                    globalRequireExitTicket: data.globalRequireExitTicket,
                    defaultTicketLayout: data.defaultTicketLayout || 'FULL'
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (applyToAll = false) => {
        try {
            setSaving(true)
            setMessage(null)
            
            const res = await fetch('/api/dashboard/tenant/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    ...settings,
                    applyToAll
                })
            })
            
            if (res.ok) {
                setMessage({ type: 'success', text: applyToAll ? 'Configurações aplicadas globalmente com sucesso!' : 'Configurações salvas com sucesso!' })
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar configurações.' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro de conexão.' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-stone-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Configurações de Atendimento</h1>
                <p className="text-gray-400">Gerencie o comportamento global de todos os seus terminais POS.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid gap-6">
                {/* 1. Saída Automática */}
                <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                    <div className="p-6 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Saída Automática</h3>
                                <p className="text-sm text-gray-400">Libera o veículo imediatamente após a detecção de um ticket pago ou isento.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={settings.globalAutoRelease}
                                onChange={(e) => setSettings({...settings, globalAutoRelease: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* 2. Impressão de Saída */}
                <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                    <div className="p-6 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Printer className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Impressão de Ticket de Saída</h3>
                                <p className="text-sm text-gray-400">Habilita a impressão automática do comprovante de saída em todos os terminais.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={settings.globalRequireExitTicket}
                                onChange={(e) => setSettings({...settings, globalRequireExitTicket: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>

                {/* 3. Layout do Ticket */}
                <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <Layout className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Layout do Ticket</h3>
                                <p className="text-sm text-gray-400">Escolha entre um layout completo ou econômico (economiza papel térmico).</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setSettings({...settings, defaultTicketLayout: 'FULL'})}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${settings.defaultTicketLayout === 'FULL' ? 'border-purple-500 bg-purple-500/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                            >
                                <h4 className="font-bold mb-1">Completo</h4>
                                <p className="text-xs text-gray-500">Logos grandes, cabeçalho detalhado e espaçamento padrão.</p>
                            </button>
                            <button 
                                onClick={() => setSettings({...settings, defaultTicketLayout: 'COMPACT'})}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${settings.defaultTicketLayout === 'COMPACT' ? 'border-purple-500 bg-purple-500/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                            >
                                <h4 className="font-bold mb-1">Econômico</h4>
                                <p className="text-xs text-gray-500">Logos reduzidos, fontes menores e sem espaços em branco desnecessários.</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                    {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    SALVAR PADRÃO GLOBAL
                </button>

                <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-red-600/10 text-red-500 border border-red-500/20 font-bold rounded-lg hover:bg-red-600/20 transition-all disabled:opacity-50"
                >
                    {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                    FORÇAR EM TODOS OS TERMINAIS
                </button>
            </div>

            <div className="p-4 bg-stone-900/50 rounded-lg border border-white/5">
                <p className="text-xs text-gray-500 italic">
                    * Ao salvar o <strong>Padrão Global</strong>, novos terminais cadastrados usarão essas definições. <br />
                    * Ao <strong>Forçar em Todos</strong>, todos os terminais ativos terão suas configurações individuais sobrescritas imediatamente.
                </p>
            </div>

            {/* Central de Atualização do App */}
            <div className="bg-gradient-to-br from-stone-900 to-black border border-stone-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all">
                    <RefreshCcw className="w-32 h-32 text-stone-500" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold tracking-widest uppercase mb-2">
                            Versão 1.9.0 Disponível
                        </div>
                        <h2 className="text-2xl font-bold">Central de Atualização (APK)</h2>
                        <p className="text-gray-400 max-w-md">Instale a versão mais recente nos terminais POS para ativar o OCR de alta performance e as novas lógicas de saída.</p>
                    </div>

                    <a 
                        href="/downloads/guardian-v1.9.0.apk" 
                        download
                        className="flex items-center gap-3 px-8 py-4 bg-stone-100 text-black font-black rounded-xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <RefreshCcw className="w-6 h-6" />
                        BAIXAR APK ATUALIZADO
                    </a>
                </div>
            </div>
        </div>
    )
}
