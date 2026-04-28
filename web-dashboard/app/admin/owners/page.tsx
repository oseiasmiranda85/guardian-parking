"use client"

import React from 'react'
import Link from 'next/link'
import { User, Plus, Mail, Settings } from 'lucide-react'

export default function OwnersPage() {
    const [owners, setOwners] = React.useState<any[]>([])

    React.useEffect(() => {
        fetch('/api/admin/owners', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setOwners(data)
            })
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Gerenciar Proprietários (Owners)</h1>
                    <p className="text-gray-400">Pessoas Físicas ou Jurídicas contratantes.</p>
                </div>
                <Link
                    href="/admin/owners/new"
                    className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    Novo Proprietário
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {owners.map(owner => (
                    <div key={owner.id} className="bg-stone-900 border border-white/10 rounded-xl p-6 hover:border-red-500/50 transition duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-stone-800 rounded-full">
                                <User className="w-6 h-6 text-gray-300" />
                            </div>
                            <Link
                                href={`/admin/owners/${owner.id}`}
                                className="text-stone-500 hover:text-white"
                            >
                                <Settings className="w-5 h-5" />
                            </Link>
                        </div>

                        <h3 className="text-xl font-bold mb-1">{owner.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{owner.document}</p>

                        <div className="space-y-2 border-t border-white/10 pt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Mail className="w-4 h-4" />
                                {owner.email}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">Estacionamentos Vinculados</span>
                            <span className="bg-white/5 px-2 py-1 rounded text-sm font-bold">{owner._count?.tenants || 0}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
