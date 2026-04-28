"use client"

import React, { useState, useEffect } from 'react'
import { MapPin, Box } from 'lucide-react'
import MapWrapper from '@/app/components/MapWrapper'

export default function AdminMapPage() {
    const [tenants, setTenants] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/tenants')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTenants(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    const handlePinClick = (id: number) => {
        window.open(`/admin/tenants/${id}`, '_blank')
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="text-red-500" />
                        Mapa Global de Estacionamentos
                    </h1>
                    <p className="text-gray-400">Visão geográfica de todos os clientes cadastrados.</p>
                </div>
                <div className="bg-stone-900 border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Box className="w-4 h-4 text-gray-500" />
                    <span className="font-bold text-white">{tenants.length}</span>
                    <span className="text-gray-400 text-sm">Unidades Locais</span>
                </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-900 text-white">Carregando coordenadas...</div>
                ) : (
                    <MapWrapper tenants={tenants} onPinClick={handlePinClick} />
                )}
            </div>
        </div>
    )
}
