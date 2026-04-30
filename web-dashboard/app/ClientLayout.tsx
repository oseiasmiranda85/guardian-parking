"use client"
import React, { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
    BarChart3,
    Users,
    CreditCard,
    Ticket,
    DollarSign,
    FileText,
    ShieldCheck,
    LogOut,
    Monitor,
    LayoutDashboard,
    MapPin,
    Settings
} from 'lucide-react'

const MenuLink = ({ href, icon: Icon, children }: any) => {
    const pathname = usePathname()
    const isActive = pathname === href
    const [finalHref, setFinalHref] = React.useState(href)

    React.useEffect(() => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        let newHref = href
        if (tenantId) {
            const separator = href.includes('?') ? '&' : '?'
            newHref = `${href}${separator}tenantId=${tenantId}`
        }
        console.log(`[MENU] Link generated: ${newHref} (original: ${href})`)
        setFinalHref(newHref)
    }, [href])

    return (
        <Link
            href={finalHref}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
            <Icon className="w-5 h-5" />
            <span>{children}</span>
        </Link>
    )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [userInitials, setUserInitials] = React.useState('US')
    const [userId, setUserId] = React.useState<number | null>(null)
    const [userRole, setUserRole] = React.useState<string | null>(null)
    const [userType, setUserType] = React.useState<string | null>(null)
    const [currentTenantName, setCurrentTenantName] = React.useState<string | null>(null)

    const searchParams = useSearchParams()

    React.useEffect(() => {
        const sessionStr = localStorage.getItem('guardian_session')
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr)
                if (session.name) {
                    const parts = session.name.split(' ')
                    if (parts.length >= 2) {
                        setUserInitials((parts[0][0] + parts[1][0]).toUpperCase())
                    } else {
                        setUserInitials(session.name.substring(0, 2).toUpperCase())
                    }
                }
                if (session.id) {
                    setUserId(session.id)
                }
                if (session.role) {
                    setUserRole(session.role)
                }
                if (session.type) {
                    setUserType(session.type)
                }
            } catch (error) {}
        }

        // Fetch Current Tenant Name for Sidebar
        let tenantId = searchParams.get('tenantId')
        if (!tenantId) {
            tenantId = sessionStorage.getItem('current_tenant_id')
        }

        if (tenantId) {
            if (tenantId.startsWith('ALL_')) {
                setCurrentTenantName('Visão Consolidada')
            } else {
                fetch(`/api/admin/tenants/${tenantId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.name) {
                            setCurrentTenantName(data.name)
                            // ALWAYS Sync session storage to match URL
                            sessionStorage.setItem('current_tenant_id', String(tenantId))
                        }
                    })
                    .catch(() => {})
            }
        }
    }, [searchParams])

    // Exclude Sidebar for Login, Portal and Admin Panel
    const isGenericPage = pathname === '/' || pathname === '/portal' || pathname.startsWith('/admin')

    if (isGenericPage) {
        return <div className="min-h-screen bg-black text-white">{children}</div>
    }

    const ROUTE_NAMES: Record<string, string> = {
        '/dashboard': 'Visão Geral',
        '/finance': 'Fluxo de Caixa',
        '/finance/reports': 'Relatórios de Caixa',
        '/tickets': 'Gestão de Tickets',
        '/operations': 'Operação',
        '/accredited': 'Credenciados',
        '/pricing': 'Tabela de Preços',
        '/users': 'Usuários',
        '/reports': 'Relatórios Gerenciais',
        '/devices': 'Dispositivos Conectados'
    }

    const currentPageName = ROUTE_NAMES[pathname] || pathname.replace('/', '')
    const displayPageName = currentTenantName ? `${currentPageName} - ${currentTenantName}` : currentPageName

    return (
        <div className="flex h-screen overflow-hidden bg-black text-white print:bg-white print:text-black print:block print:h-auto print:overflow-visible">
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1.0cm;
                        size: A4 portrait;
                    }
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                    }
                    /* Nuclear option: hide everything by default */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Show only the print container and its children */
                    .print-container, .print-container * {
                        visibility: visible !important;
                    }
                    .print-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        display: block !important;
                    }
                    /* Ensure no dark backgrounds leak */
                    div, main, section, aside, nav {
                        background: transparent !important;
                        border-color: transparent !important;
                    }
                }
            `}</style>
            {/* Sidebar */}
            <aside className="w-64 flex-none bg-stone-900 border-r border-white/10 flex flex-col z-20 print:hidden">
                <div className="p-4 border-b border-white/10 shrink-0">
                    <h1 className="text-xl font-bold text-stone-500 flex items-center gap-2">
                        <img src="/logo-guardian.png" className="w-8 h-8" style={{ filter: 'invert(69%) sepia(87%) saturate(456%) hue-rotate(105deg) brightness(101%) contrast(101%)' }} alt="Logo" />
                        GUARDIAN
                    </h1>
                    {currentTenantName && (
                        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 truncate bg-stone-500/5 px-2 py-1 rounded inline-block max-w-full">
                            {currentTenantName}
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {userType === 'ADMIN' && (
                        <div className="mb-6">
                            <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 px-4">Administração</div>
                            <Link 
                                href="/admin" 
                                className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600/20 transition-all font-bold"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                <span>Painel Master Admin</span>
                            </Link>
                        </div>
                    )}

                    {userRole !== 'OPERATOR' && (
                        <>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-2 px-4">Painéis</div>
                            <MenuLink href="/dashboard" icon={LayoutDashboard}>Visão Geral</MenuLink>
                            <MenuLink href="/dashboard/map" icon={MapPin}>Mapa da Rede</MenuLink>
                            <MenuLink href="/finance" icon={BarChart3}>Fluxo de Caixa</MenuLink>
                            <MenuLink href="/finance/reports" icon={FileText}>Relatórios de Caixa</MenuLink>
                        </>
                    )}

                    <div className={userRole !== 'OPERATOR' ? "text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-4 px-4" : "text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-2 px-4"}>Operação</div>
                    <MenuLink href="/tickets" icon={Ticket}>Gestão de Tickets</MenuLink>
                    <MenuLink href="/operations" icon={LogOut}>Saída em Massa</MenuLink>
                    <MenuLink href="/accredited" icon={ShieldCheck}>Credenciados (QR)</MenuLink>

                    {userRole !== 'OPERATOR' && (
                        <>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-4 px-4">Cadastros</div>
                            <MenuLink href="/pricing" icon={DollarSign}>Tabela de Preços</MenuLink>
                            <MenuLink href="/users" icon={Users}>Usuários e Perfis</MenuLink>

                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-4 px-4">Sistema</div>
                            <MenuLink href="/settings/attendance" icon={Settings}>Configurações de Atendimento</MenuLink>
                            <MenuLink href="/devices" icon={Monitor}>Dispositivos</MenuLink>
                            <MenuLink href="/downloads" icon={Smartphone}>Downloads (APK)</MenuLink>
                            <MenuLink href="/reports" icon={FileText}>Relatórios</MenuLink>
                        </>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 relative print:block print:bg-white print:static">
                <header className="h-14 shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur z-10 print:hidden">
                    <div className="text-sm breadcrumbs text-gray-400 flex items-center gap-2">
                        <span className="text-gray-600 font-bold">Guardian</span>
                        <span className="text-gray-700">/</span>
                        {currentTenantName && (
                            <>
                                <span className="text-stone-500/80 font-black italic tracking-tighter">{currentTenantName}</span>
                                <span className="text-gray-700">/</span>
                            </>
                        )}
                        <span className="text-gray-300 font-medium">{currentPageName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={userId ? `/profile/${userId}` : "#"} className="w-8 h-8 rounded-full bg-stone-500/20 text-stone-300 flex items-center justify-center border border-stone-500/50 font-bold hover:bg-stone-500 hover:text-black transition-colors" title="Meu Perfil">
                            {userInitials}
                        </Link>
                        <button
                            onClick={() => {
                                localStorage.removeItem('guardian_session')
                                window.location.href = '/'
                            }}
                            className="text-gray-500 hover:text-red-500 transition grid place-items-center"
                            title="Sair do Sistema"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0 print:overflow-visible print:block print:static">
                    <div className="max-w-7xl mx-auto h-full print:max-w-none print:h-auto print:static print:block">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
