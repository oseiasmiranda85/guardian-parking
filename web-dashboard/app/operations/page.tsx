"use client"

import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react'

export default function OperationsPage() {
    const [confirming, setConfirming] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [openCount, setOpenCount] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [processedCount, setProcessedCount] = useState(0)

    useEffect(() => {
        fetchCount()
    }, [])

    const fetchCount = async () => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return
        const res = await fetch(`/api/operations/mass-exit?tenantId=${tenantId}`)
        const data = await res.json()
        setOpenCount(data.count)
    }

    const handleMassExit = async () => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        setLoading(true)
        try {
            const res = await fetch('/api/operations/mass-exit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId })
            })
            const data = await res.json()
            if (data.success) {
                setProcessedCount(data.count)
                setConfirming(false)
                setCompleted(true)
            } else {
                alert('Erro ao processar')
            }
        } catch (e) {
            alert('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                <CheckCircle className="w-24 h-24 text-green-500 animate-bounce" />
                <h2 className="text-3xl font-bold">Operação Concluída</h2>
                <p className="text-gray-400 max-w-md">
                    {processedCount} veículos foram marcados como 'Saída Realizada' e o pátio consta como vazio no sistema.
                </p>
                <button
                    onClick={() => {
                        setCompleted(false)
                        fetchCount()
                    }}
                    className="mt-8 px-6 py-2 bg-stone-900 border border-white/10 rounded-lg hover:bg-stone-800 transition"
                >
                    Voltar ao Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto mt-10">
            <div className="bg-stone-900 border border-red-500/30 rounded-xl p-8 shadow-2xl shadow-red-900/10">
                <div className="flex items-center gap-4 mb-6 text-red-500">
                    <AlertTriangle className="w-10 h-10" />
                    <h2 className="text-2xl font-bold">Saída em Massa (Esvaziamento)</h2>
                </div>

                <p className="text-gray-300 leading-relaxed mb-8">
                    Esta ação é irreversível. Ela registrará a saída de <strong>TODOS</strong> os veículos que constam atualmente como "Estacionados" no sistema.
                    <br /><br />
                    Utilize esta função apenas ao final de grandes eventos quando as cancelas são liberadas.
                </p>

                <div className="bg-black/50 p-4 rounded border border-white/10 mb-8 flex items-center justify-between">
                    <span className="text-gray-400">Veículos Estacionados (Ativos):</span>
                    <strong className="text-xl text-white flex items-center gap-2">
                        {openCount !== null ? openCount : '...'}
                        <button onClick={fetchCount} title="Atualizar"><RefreshCw className="w-4 h-4 text-gray-500 hover:text-white" /></button>
                    </strong>
                </div>

                {!confirming ? (
                    <button
                        onClick={() => setConfirming(true)}
                        disabled={openCount === 0}
                        className={`w-full py-4 font-bold rounded-lg flex items-center justify-center gap-2 transition ${openCount === 0
                                ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                                : 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black'
                            }`}
                    >
                        {openCount === 0 ? 'Pátio Vazio' : 'Iniciar Procedimento de Esvaziamento'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-red-900/20 p-4 rounded border border-red-500/50 text-sm text-red-200 font-bold text-center">
                            Tem certeza absoluta? Isso afetará {openCount} registros.
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setConfirming(false)}
                                className="flex-1 py-3 bg-stone-800 rounded-lg hover:bg-stone-700 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleMassExit}
                                disabled={loading}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                                {loading ? 'Processando...' : 'CONFIRMAR SAÍDA'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
