"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, LayoutGrid, Users, Building, LogOut, FileText, MapPin, Cpu } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    const [userInitials, setUserInitials] = React.useState('ADM')
    const [userId, setUserId] = React.useState<number | null>(null)

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
            } catch (error) {}
        }
    }, [])

    return (
        <div className="flex h-screen bg-neutral-900 text-white font-sans">
            {/* Admin Sidebar */}
            <aside className="w-64 flex-none bg-black border-r border-red-900/30 flex flex-col">
                <div className="p-6 border-b border-red-900/30 shrink-0">
                    <div className="flex items-center gap-3 text-red-500">
                        <Shield className="w-8 h-8" />
                        <div>
                            <h1 className="font-bold text-lg tracking-wider">MASTER</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <NavItem href="/admin" icon={LayoutGrid} label="Visão Geral" active={pathname === '/admin'} />
                    <NavItem href="/admin/owners" icon={Users} label="Proprietários" active={pathname.startsWith('/admin/owners')} />
                    <NavItem href="/admin/tenants" icon={Building} label="Estacionamentos" active={pathname.startsWith('/admin/tenants')} />
                    <NavItem href="/admin/map" icon={MapPin} label="Mapa Global" active={pathname.startsWith('/admin/map')} />
                    <NavItem href="/admin/invoices" icon={FileText} label="Faturas SaaS" active={pathname.startsWith('/admin/invoices')} />
                    <NavItem href="/admin/integrations" icon={Cpu} label="Integrações & NOC" active={pathname.startsWith('/admin/integrations')} />
                    <NavItem href="/admin/admins" icon={Shield} label="Administradores" active={pathname.startsWith('/admin/admins')} />
                    <NavItem href="/admin/settings" icon={LayoutGrid} label="Configurações" active={pathname.startsWith('/admin/settings')} />
                </nav>

                <div className="p-4 border-t border-red-900/30 shrink-0">
                    <button
                        onClick={() => router.push('/portal')}
                        className="flex items-center gap-3 text-gray-400 hover:text-white transition w-full p-2 rounded hover:bg-white/5 text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sair do Master</span>
                    </button>
                    <p className="text-[10px] text-gray-600 mt-4 text-center">Guardian System v2.0 SaaS</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 relative">
                <header className="h-16 shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-sm z-10">
                    <h2 className="font-semibold text-gray-200">Plataforma de Gestão</h2>
                    <div className="flex items-center gap-4">
                        <Link href={userId ? `/admin/profile/${userId}` : "#"} className="w-8 h-8 rounded-full bg-red-900/50 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-400 hover:bg-red-500/80 hover:text-white transition-colors cursor-pointer" title="Meu Perfil">
                            {userInitials}
                        </Link>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}

function NavItem({ href, icon: Icon, label, active }: any) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </Link>
    )
}
