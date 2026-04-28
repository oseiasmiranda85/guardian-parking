"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, Shield, LogOut, ArrowRight, User, Search, Lock, AlertTriangle } from 'lucide-react'

// Real Data Fetching
export default function PortalPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [tenants, setTenants] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Auth Check
        const session = localStorage.getItem('guardian_session')
        if (!session) {
            router.push('/')
            return
        }
        const currentUser = JSON.parse(session)
        setUser(currentUser)

        // Fetch Data
        async function loadTenants() {
            try {
                let url = '/api/admin/tenants'
                if (currentUser.type === 'TENANT' && currentUser.tenantId) {
                    url = `/api/admin/tenants?id=${currentUser.tenantId}`
                }

                const res = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                })
                const data = await res.json()

                if (Array.isArray(data)) {
                    // Enrich data if needed, or mapping is fine
                    // Current API returns { owner: ..., subscription: ... }
                    // We need to map role. For Tenant users, role comes from session, for Master, they are Master.

                    const mapped = data.map((t: any) => ({
                        ...t,
                        // If I am a Tenant Manager, I am MANAGER. If I am Master, I see real status.
                        role: currentUser.type === 'TENANT' ? currentUser.role : 'ADMIN',
                        status: t.subscription?.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' // Simplify status for now
                    }))
                    setTenants(mapped)
                }
            } catch (err) {
                console.error("Failed to load tenants", err)
            } finally {
                setLoading(false)
            }
        }

        loadTenants()

    }, [])

    const handleAccessTenant = (tenant: any) => {
        const isMaster = user?.role === 'MASTER'

        if (tenant.status === 'BLOCKED') {
            if (!isMaster) {
                alert("Acesso Negado: Este estacionamento está bloqueado por questões financeiras. Contate o Administrador.")
                return
            } else {
                if (!confirm("AVISO: Este estacionamento está BLOQUEADO. Deseja acessar mesmo assim como Administrador?")) return
            }
        }

        if (tenant.status === 'INACTIVE') {
            if (!isMaster) {
                alert("Acesso Negado: Este estacionamento foi desativado.")
                return
            }
        }

        // Set Active Tenant Context (Future Improvement: Context API)
        // For now just passing via URL or assuming Dashboard loads based on Session + URL params
        // Ideally we redirect to /dashboard/[tenantId] or save 'current_tenant' to localstorage
        sessionStorage.setItem('current_tenant_id', tenant.id)
        console.log(`Accessing Tenant ${tenant.id}`)
        window.open('/dashboard', '_blank')
    }

    const handleAccessAdmin = () => {
        router.push('/admin')
    }

    if (!user) return null

    // Filter Logic
    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="h-screen bg-black text-white flex flex-col overflow-hidden relative">

            {/* Header */}
            <div className="flex justify-between items-center p-6 shrink-0 z-10 border-b border-white/5 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center border border-stone-500/30">
                        <span className="font-bold text-stone-500">G</span>
                    </div>
                    <span className="font-bold text-gray-400 tracking-wider">GUARDIAN</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-stone-900 border border-white/10 px-4 py-2 rounded-full">
                        <User className="w-4 h-4 text-stone-500" />
                        <span className="text-sm text-gray-300">{user.name}</span>
                    </div>
                    <button
                        onClick={() => { localStorage.removeItem('guardian_session'); router.push('/') }}
                        className="p-2 hover:bg-white/10 rounded-full transition text-gray-500 hover:text-red-500"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-0">
                <div className="w-full max-w-6xl h-full flex flex-col">

                    <div className="text-center mb-8 shrink-0">
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Bem-vindo ao Guardian</h1>
                        <p className="text-gray-400">Selecione o ambiente que deseja acessar.</p>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                        {/* Master Admin Panel Option */}
                        {(user.role === 'MASTER' || user.type === 'ADMIN') && (
                            <div
                                onClick={handleAccessAdmin}
                                className="bg-neutral-900 border border-red-900/30 hover:border-red-600 rounded-2xl p-8 cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:shadow-red-900/20 flex flex-col justify-between h-full max-h-[600px] overflow-hidden"
                            >
                                <div>
                                    <div className="bg-red-900/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                        <Shield className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2 group-hover:text-red-500 transition">Painel Master</h2>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Gestão completa da plataforma.<br /><br />
                                        • Gerenciar Clientes e Contratos<br />
                                        • Controle Financeiro Global<br />
                                        • Auditoria e Logs de Segurança
                                    </p>
                                </div>

                                <div className="flex items-center text-red-500 font-bold text-sm mt-6">
                                    Acessar Admin <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                                </div>
                            </div>
                        )}

                        {/* Tenants List Column */}
                        <div className="flex flex-col h-full min-h-0 bg-stone-900/50 rounded-2xl border border-white/5 p-6 backdrop-blur-sm max-h-[600px]">
                            <div className="shrink-0 mb-4">
                                <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Meus Estacionamentos</h3>
                                <div className="relative">
                                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-stone-500 outline-none transition"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Scrollable List Area */}
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0">
                                {filteredTenants.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                                        <Building className="w-8 h-8 mb-2 opacity-20" />
                                        Nenhum estacionamento encontrado.
                                    </div>
                                ) : (
                                    filteredTenants.map(tenant => (
                                        <div
                                            key={tenant.id}
                                            onClick={() => handleAccessTenant(tenant)}
                                            className={`bg-black border border-white/10 rounded-xl p-4 cursor-pointer group transition-all duration-300 flex items-center justify-between hover:border-white/30
                                                ${tenant.status === 'BLOCKED' ? 'opacity-75 border-red-900/30' : ''}
                                                ${tenant.status === 'INACTIVE' ? 'opacity-50 grayscale' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tenant.status === 'BLOCKED' ? 'bg-red-900/20 text-red-500' : 'bg-stone-800 text-gray-400'
                                                    }`}>
                                                    {tenant.status === 'BLOCKED' ? <Lock className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-sm group-hover:text-stone-300 transition">{tenant.name}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                                                            {{
                                                                'MANAGER': 'GERENTE',
                                                                'SUPERVISOR': 'SUPERVISOR',
                                                                'OPERATOR': 'OPERADOR'
                                                            }[tenant.role as string] || tenant.role}
                                                        </span>
                                                        {tenant.status !== 'ACTIVE' && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${tenant.status === 'BLOCKED' ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-gray-400'
                                                                }`}>
                                                                {tenant.status === 'BLOCKED' ? 'BLOQUEADO' : 'INATIVO'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {tenant.status === 'ACTIVE' && (
                                                <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-white group-hover:translate-x-1 transition" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="text-center pt-4 shrink-0 border-t border-white/5 mt-2">
                                {/* <a href="#" className="text-xs text-stone-600 hover:text-stone-400 dashed-underline">Solicitar novo acesso</a> */}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 text-center shrink-0">
                <p className="text-[10px] text-gray-700 font-mono">ID do Sistema: {user.id || 'VISITANTE'} | Ambiente: Produção</p>
            </div>
        </div>
    )
}
