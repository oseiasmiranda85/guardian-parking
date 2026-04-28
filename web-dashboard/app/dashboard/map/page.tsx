"use client"

import React, { useState, useEffect } from 'react'
import { MapPin, Layers } from 'lucide-react'
import MapWrapper from '@/app/components/MapWrapper'

export default function ClientMapPage() {
    const [tenants, setTenants] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchNetwork = async () => {
            const currentId = sessionStorage.getItem('current_tenant_id')
            if (!currentId) return setLoading(false)

            try {
                // Descobre o dono atual
                const resTenant = await fetch(`/api/admin/tenants/${currentId}`)
                const tenantData = await resTenant.json()
                
                if (tenantData && tenantData.ownerId) {
                    // Puxa toda a rede de estacionamentos deste dono
                    const resNetwork = await fetch(`/api/admin/tenants?ownerId=${tenantData.ownerId}`)
                    const networkData = await resNetwork.json()
                    
                    if (Array.isArray(networkData)) {
                        setTenants(networkData)
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        
        fetchNetwork()
    }, [])

    const handlePinClick = (id: number) => {
        // Switch contextual tenant in new tab
        sessionStorage.setItem('current_tenant_id', String(id))
        window.open('/dashboard', '_blank')
    }

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Layers className="text-emerald-500" />
                        Minha Rede de Estacionamentos
                    </h1>
                    <p className="text-gray-400">As marcações abaixo representam todas as suas propriedades ativas.</p>
                </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] text-white">Carregando malha...</div>
                ) : (
                    <MapWrapper tenants={tenants} onPinClick={handlePinClick} />
                )}
            </div>
        </div>
    )
}
