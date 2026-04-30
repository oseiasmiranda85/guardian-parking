"use client"

import React, { useState, useEffect } from 'react'
import { Activity, Database, ShieldCheck, Wifi, RefreshCw, AlertCircle, Cpu, ExternalLink, Filter, CheckCircle2, XCircle, Plus, Info, Key, Globe, Link2, Ghost } from 'lucide-react'

interface ServiceStatus {
    id: string
    name: string
    status: 'UP' | 'DOWN' | 'ERROR' | 'WARNING'
    latency?: string
    uptime?: string
    lastSync?: string
    type?: string
    tenantName?: string
}

const NeonMonitoring = () => {
    const [neonStats, setNeonStats] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchNeon = () => {
            fetch('/api/admin/neon/stats')
                .then(res => res.json())
                .then(data => {
                    setNeonStats(data)
                    setLoading(false)
                })
                .catch(() => setLoading(false))
        }
        fetchNeon()
        const interval = setInterval(fetchNeon, 30000)
        return () => clearInterval(interval)
    }, [])

    if (loading) return <div className="animate-pulse bg-stone-900 h-32 rounded-3xl border border-white/10 mb-8"></div>

    return (
        <div className="bg-stone-900/80 border border-white/10 p-8 rounded-[40px] mb-8 relative overflow-hidden group hover:border-red-500/30 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all">
                <Database className="w-32 h-32 text-red-500" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${neonStats?.status === 'ready' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-yellow-500'}`}></div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Database Core Monitor</h4>
                        <p className="text-3xl font-black text-white italic tracking-tighter uppercase">{neonStats?.status || 'Sincronizando...'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Region</p>
                        <p className="text-sm font-bold text-gray-300">{neonStats?.region || '---'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">PG Version</p>
                        <p className="text-sm font-bold text-gray-300">v{neonStats?.pg_version || '---'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Project ID</p>
                        <p className="text-sm font-bold text-gray-400 font-mono">old-moon-8... <ExternalLink className="inline w-3 h-3" /></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function IntegrationsDashboard() {
    const [internal, setInternal] = useState<ServiceStatus[]>([])
    const [external, setExternal] = useState<ServiceStatus[]>([])
    const [tenants, setTenants] = useState<any[]>([])
    const [selectedTenant, setSelectedTenant] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showGuideModal, setShowGuideModal] = useState(false)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    // Form State
    const [newInteg, setNewInteg] = useState({
        name: '',
        type: 'WEBHOOK',
        targetUrl: '',
        apiKey: '',
        tenantId: ''
    })

    const fetchStatus = async () => {
        try {
            const qs = selectedTenant ? `?tenantId=${selectedTenant}` : ''
            const res = await fetch(`/api/admin/system/integrations${qs}`, { cache: 'no-store' })
            const data = await res.json()
            
            if (data.error) {
                setError(data.error)
            } else {
                setInternal(data.internal || [])
                setExternal(data.external || [])
                setError(null)
            }
        } catch (err: any) {
            setError("Falha crítica ao conectar com a API de Monitoramento.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const fetchTenants = async () => {
        try {
            const res = await fetch('/api/admin/tenants')
            const data = await res.json()
            setTenants(Array.isArray(data) ? data : [])
        } catch (error) {}
    }

    useEffect(() => {
        fetchStatus()
        fetchTenants()
        const interval = setInterval(fetchStatus, 15000) // Fast refresh for NOC
        return () => clearInterval(interval)
    }, [selectedTenant])

    const handleCreate = async () => {
        if (!newInteg.name || !newInteg.type) return
        try {
            const res = await fetch('/api/admin/system/integrations/crud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInteg)
            })
            if (res.ok) {
                showToast("Integração configurada com sucesso!", "success")
                setShowAddModal(false)
                setNewInteg({ name: '', type: 'WEBHOOK', targetUrl: '', apiKey: '', tenantId: '' })
                fetchStatus()
            }
        } catch (error) { showToast("Falha ao salvar integração", "error") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remover esta conexão permanentemente?")) return
        try {
            await fetch(`/api/admin/system/integrations/crud?id=${id}`, { method: 'DELETE' })
            fetchStatus()
        } catch (error) {}
    }

    const handleRestart = async (serviceId: string) => {
        setRefreshing(serviceId)
        try {
            const res = await fetch('/api/admin/system/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceId, action: 'RESTART', tenantId: selectedTenant })
            })
            const data = await res.json()
            if (data.success) {
                showToast(data.message, "success")
                fetchStatus()
            }
        } catch (error) {
            showToast("Falha ao reiniciar", "error")
        } finally {
            setRefreshing(null)
        }
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 4000)
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header / NOC Dashboard */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black border border-white/10 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-stone-800 to-red-600"></div>
                <div>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <Cpu className="w-12 h-12 text-red-600 animate-pulse" />
                        NOC CENTER 2.1
                    </h2>
                    <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-bold mt-2">DADOS REAIS • MONITORAMENTO GLOBAL DE INFRAESTRUTURA • PROCESSOR V2</p>
                </div>
                <div className="flex gap-4 mt-6 md:mt-0">
                    <button onClick={() => setShowGuideModal(true)} className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-xs font-bold hover:bg-white/10 transition uppercase tracking-widest"><Info className="w-4 h-4 text-blue-500" /> Guia de Conexão</button>
                    <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-2xl text-xs font-bold hover:bg-red-500 transition shadow-lg shadow-red-900/40 uppercase tracking-widest"><Plus className="w-4 h-4" /> Nova Integração</button>
                </div>
            </div>
            
            <NeonMonitoring />

            {/* Filter Section */}
            <div className="flex items-center gap-4 bg-stone-900/30 p-4 rounded-2xl border border-white/5">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filtrar por Estabelecimento:</span>
                <select 
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="bg-black border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-gray-300 outline-none"
                >
                    <option value="">Todas as Conexões Globais</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            {/* Error Message if any */}
            {error && (
                <div className="bg-red-950/40 border border-red-500/30 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <div>
                        <h4 className="text-red-500 font-black uppercase text-xs tracking-widest">Erro de Sincronização de Monitoramento</h4>
                        <p className="text-gray-400 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Core Infrastructure Nodes */}
            {loading ? (
                <div className="p-20 text-center animate-pulse">
                    <RefreshCw className="w-10 h-10 text-gray-700 mx-auto animate-spin mb-4" />
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black">Sincronizando nós do sistema...</p>
                </div>
            ) : internal.length === 0 ? (
                <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center">
                    <Activity className="w-8 h-8 text-gray-800 mx-auto mb-2" />
                    <p className="text-gray-600 text-xs uppercase font-bold">Nenhum serviço interno detectado no motor.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {internal.map(node => (
                        <div key={node.id} className="bg-stone-900/50 border border-white/10 p-6 rounded-3xl relative group hover:border-red-500/50 transition-all duration-500">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{node.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${node.status === 'UP' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'} animate-pulse`}></div>
                                        <span className="text-xl font-black italic">{node.status}</span>
                                    </div>
                                </div>
                                {node.id === 'db' ? <Database className="w-6 h-6 text-gray-700" /> : <Activity className="w-6 h-6 text-gray-700" />}
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-gray-600">LATÊNCIA: <span className="text-emerald-500">{node.latency}</span></span>
                                <span className="text-gray-600">UPTIME: <span className="text-gray-400">{node.uptime}</span></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}


            {/* External Partners / Tenant Integrations */}
            <div className="bg-stone-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                 <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                    <h3 className="text-lg font-bold flex items-center gap-3"><Globe className="w-5 h-5 text-red-500" /> Integrações Ativas e Conexões Externas</h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Operante
                        <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div> Falha Crítica
                    </div>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/50 text-[9px] uppercase tracking-[0.2em] text-gray-500 font-black">
                            <tr>
                                <th className="p-8">Estabelecimento / Nome</th>
                                <th className="p-8">Endpoint / Chave</th>
                                <th className="p-8 text-center">Status Conexão</th>
                                <th className="p-8 text-right">Controle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans">
                            {external.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <Ghost className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                                        <p className="text-gray-600 font-bold uppercase text-[10px] tracking-widest">Nenhuma integração real conectada</p>
                                    </td>
                                </tr>
                            ) : external.map(integ => (
                                <tr key={integ.id} className="hover:bg-white/2 group transition-colors">
                                    <td className="p-8">
                                        <div className="text-xs font-black text-white uppercase group-hover:text-red-500 transition-colors">{integ.name}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Tenant: <span className="text-white">{integ.tenantName}</span></div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex items-center gap-2 group/url cursor-help" title={integ.type}>
                                            <Link2 className="w-3 h-3 text-gray-600" />
                                            <span className="text-[10px] font-mono text-gray-400 group-hover/url:text-blue-400 transition-colors">HOST: ...{integ.id.substring(0,6)}...</span>
                                            <span className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-black">{integ.type}</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-center">
                                        <div className="inline-flex items-center gap-3 bg-black/40 px-6 py-2 rounded-full border border-white/5">
                                            {integ.status === 'UP' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                            <span className={`text-[11px] font-black uppercase tracking-tighter ${integ.status === 'UP' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {integ.status === 'UP' ? 'Sincronizado' : 'Timeout'}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-mono">({integ.latency})</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleRestart(integ.id)}
                                                className={`p-3 rounded-2xl bg-white/5 text-gray-400 hover:bg-blue-600 hover:text-white transition-all ${refreshing === integ.id ? 'animate-spin' : ''}`}
                                            >
                                                <RefreshCw className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(integ.id)}
                                                className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>

            {/* MODAL: Nova Integração */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-stone-900 border border-white/10 rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                        <h3 className="text-3xl font-black mb-8 italic italic tracking-tighter">CONFIGURAR NODE</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Nome Identificador</label>
                                <input 
                                    type="text" 
                                    value={newInteg.name}
                                    onChange={e => setNewInteg({...newInteg, name: e.target.value})}
                                    placeholder="Ex: Integração ERP Totvs"
                                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-red-600 outline-none transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Tipo de Conexão</label>
                                    <select 
                                        value={newInteg.type}
                                        onChange={e => setNewInteg({...newInteg, type: e.target.value})}
                                        className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 text-white outline-none"
                                    >
                                        <option value="WEBHOOK">Webhook (POST)</option>
                                        <option value="REST_API">REST API (Pull)</option>
                                        <option value="GATEWAY">Cloud Gateway</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Estabelecimento</label>
                                    <select 
                                        value={newInteg.tenantId}
                                        onChange={e => setNewInteg({...newInteg, tenantId: e.target.value})}
                                        className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 text-white outline-none italic"
                                    >
                                        <option value="">GLOBAL (Todos)</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Endereço de Destino (Endpoint)</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-4 w-5 h-5 text-gray-600" />
                                    <input 
                                        type="url" 
                                        value={newInteg.targetUrl}
                                        onChange={e => setNewInteg({...newInteg, targetUrl: e.target.value})}
                                        placeholder="https://api.parceiro.com.br/v1/webhook"
                                        className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:border-red-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">API Key de Autenticação</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-4 w-5 h-5 text-gray-600" />
                                    <input 
                                        type="text" 
                                        value={newInteg.apiKey}
                                        onChange={e => setNewInteg({...newInteg, apiKey: e.target.value})}
                                        placeholder="sk_live_xxxxxxxxxxxxxxxx"
                                        className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:border-red-600 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 rounded-2xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 transition uppercase text-xs">Descartar</button>
                            <button onClick={handleCreate} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-900/40 hover:bg-red-500 transition uppercase text-xs">Ativar Conexão</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Guia de Integração (Passo a Passo) */}
            {showGuideModal && (
                <div className="fixed inset-0 bg-black/98 z-[110] flex items-center justify-center p-4 backdrop-blur-3xl overflow-y-auto">
                    <div className="bg-stone-900 border border-white/10 rounded-[50px] p-12 max-w-2xl w-full shadow-2xl my-20">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-4xl font-black text-white italic italic tracking-tighter">MANUAL DE CONEXÃO</h3>
                                <p className="text-gray-500 text-xs uppercase tracking-widest mt-2 font-bold">VINCULANDO ESTABELECIMENTOS A SISTEMAS EXTERNOS</p>
                            </div>
                            <button onClick={() => setShowGuideModal(false)} className="text-gray-500 hover:text-white bg-white/5 w-10 h-10 rounded-full flex items-center justify-center font-bold">✕</button>
                        </div>
                        
                        <div className="space-y-8">
                            <GuideStep number="01" title="Defina o Escopo">
                                Escolha se a integração deve ser **Global** (todas as entradas/saídas da plataforma) ou **Específica** para um estabelecimento único. No formulário de cadastro, use o campo "Estabelecimento" para realizar esse vínculo.
                            </GuideStep>

                            <GuideStep number="02" title="Configure o Endpoint">
                                O sistema Guardian enviará um JSON via **POST** para a URL configurada sempre que ocorrer um evento (Entrada/Pagamento/Saída). Certifique-se que o destino aceita conexões HTTPS e valida JSON.
                            </GuideStep>

                            <GuideStep number="03" title="Segurança">
                                Recomendamos o uso do **API Key**. O Guardian enviará esta chave no cabeçalho `x-api-key`. Seu servidor deve validar este token para garantir que a requisição veio de nossa infraestrutura.
                            </GuideStep>

                            <div className="bg-black/50 border border-red-500/20 p-6 rounded-3xl">
                                <h4 className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" /> Exemplo de Payload (Entrada)
                                </h4>
                                <pre className="text-[10px] text-gray-400 font-mono leading-relaxed overflow-x-auto">
{`{
  "event": "VEHICLE_ENTRY",
  "tenantId": 142,
  "data": {
    "plate": "ABC1D23",
    "timestamp": "2026-04-22T01:30:00Z",
    "operator": "Guarita 01"
  }
}`}
                                </pre>
                            </div>
                        </div>

                        <button onClick={() => setShowGuideModal(false)} className="w-full mt-10 py-5 bg-blue-600 text-white rounded-3xl font-black hover:bg-blue-500 transition-all uppercase text-xs tracking-widest shadow-xl shadow-blue-900/30">
                            ENTENDI, FECHAR MANUAL
                        </button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-[100] px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shadow-lg" /> : <AlertCircle className="w-5 h-5 shadow-lg" />}
                    <span className="font-black text-xs uppercase tracking-tighter">{toast.message}</span>
                </div>
            )}
        </div>
    )
}

function GuideStep({ number, title, children }: any) {
    return (
        <div className="flex gap-6">
            <span className="text-5xl font-black text-red-900/30 italic italic tracking-tighter">{number}</span>
            <div>
                <h4 className="text-white font-bold uppercase text-xs tracking-widest mb-2">{title}</h4>
                <p className="text-gray-400 text-xs leading-relaxed">{children}</p>
            </div>
        </div>
    )
}

function Trash2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}
