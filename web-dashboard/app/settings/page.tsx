"use client"

import React, { useState } from 'react'
import { Save, AlertTriangle, CreditCard, LogOut } from 'lucide-react'

export default function SettingsPage() {
    // Mock State - In real app, fetch from Backend/API
    const [paymentMode, setPaymentMode] = useState<'EXIT' | 'ENTRY'>('EXIT')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = () => {
        setIsSaving(true)
        // Simulate API Call
        setTimeout(() => {
            setIsSaving(false)
            alert('Configuração salva com sucesso! Os terminais POS serão atualizados em até 1 minuto.')
        }, 1500)
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-stone-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-stone-400 transition disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
            </div>

            {/* Payment Flow Section */}
            <div className="bg-stone-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-stone-500" />
                    Fluxo de Cobrança
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Exit Mode (Default) */}
                    <label className={`relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all ${paymentMode === 'EXIT'
                        ? 'border-stone-500 bg-stone-500/10'
                        : 'border-white/10 hover:bg-white/5'
                        }`}>
                        <input
                            type="radio"
                            name="paymentMode"
                            value="EXIT"
                            checked={paymentMode === 'EXIT'}
                            onChange={() => setPaymentMode('EXIT')}
                            className="sr-only"
                        />
                        <div className="flex items-center gap-3 mb-2">
                            <LogOut className={`w-6 h-6 ${paymentMode === 'EXIT' ? 'text-stone-500' : 'text-gray-400'}`} />
                            <span className="font-bold text-lg">Pague na Saída (Padrão)</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            O ticket é emitido na entrada sem cobrança. O cliente paga no terminal de saída ou caixa assistido antes de sair.
                            <br /><br />
                            <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Ideal para: Shoppings, Rotativos, Supermercados.</span>
                        </p>
                    </label>

                    {/* Entry Mode (Pre-Paid) */}
                    <label className={`relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all ${paymentMode === 'ENTRY'
                        ? 'border-stone-500 bg-stone-500/10'
                        : 'border-white/10 hover:bg-white/5'
                        }`}>
                        <input
                            type="radio"
                            name="paymentMode"
                            value="ENTRY"
                            checked={paymentMode === 'ENTRY'}
                            onChange={() => setPaymentMode('ENTRY')}
                            className="sr-only"
                        />
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className={`w-6 h-6 ${paymentMode === 'ENTRY' ? 'text-stone-500' : 'text-gray-400'}`} />
                            <span className="font-bold text-lg">Cobrança Antecipada (Entrada)</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            A cobrança é realizada imediatamente na admissão do veículo. O ticket só é emitido após a confirmação do pagamento.
                            <br /><br />
                            <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Ideal para: Eventos, Shows, Estacionamentos Flat.</span>
                        </p>
                    </label>
                </div>

                {paymentMode === 'ENTRY' && (
                    <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 text-yellow-500/80">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">
                            <strong>Atenção:</strong> No modo antecipado, certifique-se de que os operadores tenham máquinas POS ativas e bobinas suficientes, pois cada entrada gerará uma transação financeira.
                        </p>
                    </div>
                )}
            </div>

            {/* Search Methods Section */}
            <div className="bg-stone-900 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-stone-500" />
                    Métodos de Busca na Saída
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    Defina quais opções o operador poderá utilizar para localizar um veículo ou ticket na tela de saída.
                </p>

                <div className="flex flex-col gap-4">
                    <label className="flex items-center gap-3 p-4 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:bg-black/40 transition">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-600 text-stone-500 focus:ring-stone-500 bg-gray-700" />
                        <span className="font-bold">Busca por Placa (OCR/Digitação)</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:bg-black/40 transition">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-600 text-stone-500 focus:ring-stone-500 bg-gray-700" />
                        <span className="font-bold">Busca por Número do Ticket</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:bg-black/40 transition">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-600 text-stone-500 focus:ring-stone-500 bg-gray-700" />
                        <span className="font-bold">Leitura de QR Code (Câmera)</span>
                    </label>
                </div>
            </div>
        </div>
    )
}

import { Search } from 'lucide-react'
