"use client"

import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

export default function MapComponent({ tenants, onPinClick }: { tenants: any[], onPinClick: (id: number) => void }) {
    
    // Default Center: Center of Brazil
    const defaultCenter = [-14.235, -51.925]
    let center: [number, number] = defaultCenter as [number, number]
    let zoom = 4

    const validTenants = tenants.filter(t => t.latitude && t.longitude)
    if (validTenants.length > 0) {
        center = [validTenants[0].latitude, validTenants[0].longitude]
        zoom = validTenants.length === 1 ? 15 : 5
    }

    return (
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validTenants.map(t => (
                <Marker 
                    key={t.id} 
                    position={[t.latitude, t.longitude]}
                    eventHandlers={{
                        click: () => onPinClick(t.id)
                    }}
                >
                    <Popup>
                        <div className="text-center p-1">
                            <h3 className="font-bold text-gray-900 m-0">{t.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 mb-2 leading-tight">{t.address || 'Sem endereço'}</p>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onPinClick(t.id) }}
                                className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700 w-full transition-colors"
                            >
                                Acessar Painel
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
