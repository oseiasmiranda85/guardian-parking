"use client"
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-[#111] border border-white/5 w-full h-full rounded-2xl flex flex-col items-center justify-center text-gray-500">
        <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mb-4">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
        </div>
        Carregando Mapa...
    </div>
  )
})

export default MapComponent
