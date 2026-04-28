"use client"

import React, { useEffect, useState } from 'react'
import { Settings, Save } from 'lucide-react'

export default function AdminSettingsPage() {
    const [config, setConfig] = useState({
        blockToleranceDays: 5,
        penaltyRate: 0.02,
        interestRate: 0.01
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetch('/api/admin/config').then(res => res.json()).then(data => {
            if (data.id) setConfig(data)
        })
    }, [])

    const handleSave = async () => {
        setLoading(true)
        await fetch('/api/admin/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        })
        setLoading(false)
        alert('Configurações Salvas!')
    }

    return (
        <div className="max-w-2xl space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-stone-500" />
                Configurações Globais (SaaS)
            </h2>

            <div className="bg-stone-900 border border-white/10 rounded-xl p-6 space-y-6">
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Dias de Tolerância (Auto-Block)</label>
                    <input
                        type="number"
                        value={config.blockToleranceDays}
                        onChange={e => setConfig({ ...config, blockToleranceDays: parseInt(e.target.value) })}
                        className="w-full bg-black border border-white/20 p-3 rounded text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Dias após o vencimento até o bloqueio automático do Tenant.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Multa Fixa (Decimal)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={config.penaltyRate}
                            onChange={e => setConfig({ ...config, penaltyRate: parseFloat(e.target.value) })}
                            className="w-full bg-black border border-white/20 p-3 rounded text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ex: 0.02 = 2%</p>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Juros Mensais (Decimal)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={config.interestRate}
                            onChange={e => setConfig({ ...config, interestRate: parseFloat(e.target.value) })}
                            className="w-full bg-black border border-white/20 p-3 rounded text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ex: 0.01 = 1% ao mês</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-stone-100 text-black font-bold py-3 rounded-lg hover:bg-stone-300 transition flex justify-center items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    )
}
