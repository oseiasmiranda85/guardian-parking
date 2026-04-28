"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Filter, ChevronDown, Check, X } from 'lucide-react'

interface FilterBarProps {
    onFilterChange: (filters: {
        dateRange: string,
        startDate: string | null,
        endDate: string | null,
        paymentMethod: string,
        vehicleType: string
    }) => void
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
    const [dateRange, setDateRange] = useState('Hoje')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Filters
    const [paymentMethod, setPaymentMethod] = useState('ALL')
    const [vehicleType, setVehicleType] = useState('ALL')

    // Menus
    const [showDateMenu, setShowDateMenu] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Notify Parent ONLY on explicit Apply
    const applyFilters = () => {
        let start: string | null = null
        let end: string | null = null

        // Helper to get YYYY-MM-DD in LOCAL time
        const getLocalStr = (d: Date) => {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }

        // Logic for Date Ranges
        if (dateRange === 'Hoje') {
            const today = getLocalStr(new Date())
            start = today
            end = today
        } else if (dateRange === 'Ontem') {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yStr = getLocalStr(yesterday)
            start = yStr
            end = yStr
        } else if (dateRange === '7 Dias') {
            const endD = new Date()
            const startD = new Date()
            startD.setDate(startD.getDate() - 7)
            end = getLocalStr(endD)
            start = getLocalStr(startD)
        } else if (dateRange === '30 Dias') {
            const endD = new Date()
            const startD = new Date()
            startD.setDate(startD.getDate() - 30)
            end = getLocalStr(endD)
            start = getLocalStr(startD)
        } else if (dateRange === 'Personalizado') {
            start = startDate
            end = endDate
        }

        onFilterChange({
            dateRange,
            startDate: start,
            endDate: end,
            paymentMethod,
            vehicleType
        })
    }

    // Initial Load - Apply Default "Hoje" 
    useEffect(() => {
        applyFilters()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="flex flex-wrap gap-3 items-center">

            {/* Date Selector */}
            <div className="relative">
                <button
                    onClick={() => setShowDateMenu(!showDateMenu)}
                    className="flex items-center gap-2 bg-stone-900 border border-white/10 px-4 py-2 rounded-lg hover:bg-stone-800 transition text-sm min-w-[160px] justify-between"
                >
                    <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4 text-stone-500" />
                        <span>{dateRange}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {showDateMenu && (
                    <div className="absolute top-12 left-0 w-64 bg-stone-900 border border-white/10 rounded-lg shadow-xl z-30 p-2 flex flex-col">
                        {['Hoje', 'Ontem', '7 Dias', '30 Dias'].map(range => (
                            <button
                                key={range}
                                onClick={() => { setDateRange(range); setShowDateMenu(false) }}
                                className={`px-4 py-2 text-left rounded hover:bg-white/10 text-sm transition ${dateRange === range ? 'bg-white/5 text-white font-bold' : 'text-gray-400'}`}
                            >
                                {range}
                            </button>
                        ))}
                        <button
                            onClick={() => setDateRange('Personalizado')}
                            className={`px-4 py-2 text-left rounded hover:bg-white/10 text-sm transition border-t border-white/10 mt-1 ${dateRange === 'Personalizado' ? 'bg-white/5 text-white font-bold' : 'text-gray-400'}`}
                        >
                            Personalizado
                        </button>

                        {dateRange === 'Personalizado' && (
                            <div className="p-2 border-t border-white/10 mt-2 space-y-2">
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold">Início</label>
                                    <input
                                        type="date"
                                        className="w-full bg-black border border-white/20 rounded px-2 py-1 text-xs text-white"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold">Fim</label>
                                    <input
                                        type="date"
                                        className="w-full bg-black border border-white/20 rounded px-2 py-1 text-xs text-white"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Advanced Filters Button */}
            <div className="relative">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 border px-4 py-2 rounded-lg transition text-sm ${(paymentMethod !== 'ALL' || vehicleType !== 'ALL')
                        ? 'bg-stone-800 border-green-500 text-green-400'
                        : 'bg-stone-900 border-white/10 hover:bg-stone-800 text-gray-300'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    <span>Filtros {(paymentMethod !== 'ALL' || vehicleType !== 'ALL') ? '(Ativos)' : ''}</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                </button>

                {showFilters && (
                    <div className="absolute top-12 left-0 w-72 bg-stone-900 border border-white/10 rounded-lg shadow-xl z-30 p-4 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Meio de Pagamento</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded p-2 text-sm text-white"
                            >
                                <option value="ALL">Todos os métodos</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                                <option value="PIX">PIX</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Tipo de Veículo</label>
                            <select
                                value={vehicleType}
                                onChange={(e) => setVehicleType(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded p-2 text-sm text-white"
                            >
                                <option value="ALL">Todos os tipos</option>
                                <option value="Carro">Carro (Passeio)</option>
                                <option value="Moto">Moto</option>
                                <option value="Utilitário">Utilitário / Caminhonete</option>
                            </select>
                        </div>

                        <div className="pt-2 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => { setPaymentMethod('ALL'); setVehicleType('ALL') }}
                                className="text-xs text-red-400 hover:text-red-300 mr-auto flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Limpar
                            </button>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="bg-stone-700 text-white px-3 py-1 rounded text-xs font-bold hover:bg-stone-600"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* APPLY BUTTON */}
            <button
                onClick={applyFilters}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-green-900/20"
            >
                <Check className="w-4 h-4" />
                Aplicar
            </button>

            {/* Active Badges */}
            {(paymentMethod !== 'ALL') && (
                <span className="flex items-center gap-1 bg-stone-800 border border-stone-600 px-2 py-1 rounded text-xs text-stone-300">
                    Pgto: {paymentMethod} <button onClick={() => setPaymentMethod('ALL')}><X className="w-3 h-3 hover:text-white" /></button>
                </span>
            )}
            {(vehicleType !== 'ALL') && (
                <span className="flex items-center gap-1 bg-stone-800 border border-stone-600 px-2 py-1 rounded text-xs text-stone-300">
                    Veículo: {vehicleType} <button onClick={() => setVehicleType('ALL')}><X className="w-3 h-3 hover:text-white" /></button>
                </span>
            )}

        </div>
    )
}
