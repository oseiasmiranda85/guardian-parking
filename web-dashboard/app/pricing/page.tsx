"use client"

import React, { useState, useEffect } from 'react'
import { Clock, Plus, Save, Trash2, AlertCircle, CheckCircle, Tag, Pencil, Car, Calendar, DollarSign, Ban, Copy } from 'lucide-react'

export default function PricingPage() {
    const [tables, setTables] = useState<any[]>([])
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    // Editor Logic State
    const [editorTab, setEditorTab] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID')
    
    // Core Entity
    const [editorName, setEditorName] = useState('')
    const [editorVehicleType, setEditorVehicleType] = useState('CAR')
    const [editorIsActive, setEditorIsActive] = useState(false)
    
    // POSTPAID State (Simple)
    const [postTolerancia, setPostTolerancia] = useState('15')
    const [postPrimeiraHoraPreco, setPostPrimeiraHoraPreco] = useState('15.00')
    const [postAddHoraPreco, setPostAddHoraPreco] = useState('10.00')
    const [postMaxDiaria, setPostMaxDiaria] = useState('50.00')

    // PREPAID State (Turns)
    const [preTolerancia, setPreTolerancia] = useState('15')
    const [preTurnos, setPreTurnos] = useState<any[]>([])

    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const fetchTables = async () => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        setLoading(true)
        const res = await fetch(`/api/pricing?tenantId=${tenantId}`)
        const data = await res.json()
        if (Array.isArray(data)) {
            setTables(data)
        }
        setLoading(false)
    }

    const selectTable = (table: any) => {
        setSelectedTableId(table.id)
        setEditorName(table.name)
        setEditorVehicleType(table.vehicleType || 'CAR')
        setEditorIsActive(table.isActive)
        
        const isPrepaid = table.billingMode === 'PREPAID'
        setEditorTab(isPrepaid ? 'PREPAID' : 'POSTPAID')

        // Reverse Engineer logic from slots to simple UI states
        if (isPrepaid) {
            // Prepaid uses slots for turns + slot 0 for tolerance
            const slots = table.slots || []
            if (slots.length > 0 && slots[0].price === 0) {
                setPreTolerancia(String(slots[0].maxMinutes))
                setPreTurnos(slots.slice(1)) 
            } else {
                setPreTolerancia('15')
                setPreTurnos(slots)
            }
        } else {
            // Postpaid
            const slots = table.slots || []
            if (slots.length > 0) {
                setPostTolerancia(String(slots[0].maxMinutes)) // Slot 0 is usually tolerance
                if (slots.length > 1) setPostPrimeiraHoraPreco(slots[1].price.toFixed(2))
                if (slots.length > 2) {
                    const addPrice = slots[2].price - slots[1].price
                    setPostAddHoraPreco(addPrice > 0 ? addPrice.toFixed(2) : slots[2].price.toFixed(2))
                }
                const max = slots[slots.length - 1]?.price
                setPostMaxDiaria(max ? max.toFixed(2) : '50.00')
            }
        }
    }

    const handleNewTable = (mode: 'POSTPAID' | 'PREPAID') => {
        setSelectedTableId(null)
        setEditorTab(mode)
        setEditorName(mode === 'POSTPAID' ? 'Nova Tabela Rotativa' : 'Novo Evento / Preço Fixo')
        setEditorVehicleType('CAR')
        setEditorIsActive(false)
        setPreTurnos([])
    }

    const handleAddTurno = () => {
        setPreTurnos([...preTurnos, { startTime: '00:00', endTime: '23:59', price: 20.0 }])
    }

    // Engine: Generates mathematical slots before sending to API
    const generateSlots = () => {
        let finalSlots = []

        if(editorTab === 'PREPAID') {
            // Slot 0: Tolerance (Logical refund tracker for exit-calc)
            const tol = parseInt(preTolerancia) || 0
            finalSlots.push({ minMinutes: 0, maxMinutes: tol, price: 0 })

            // Turnos (Mapped with Fixed Time)
            preTurnos.forEach((t) => {
                finalSlots.push({
                    minMinutes: 0, maxMinutes: 1440, // irrelevant for fixed_time but required for DB
                    startTime: t.startTime,
                    endTime: t.endTime,
                    price: parseFloat(t.price) || 0
                })
            })
        } else {
            // POSTPAID Mathematical mapping
            const tol = parseInt(postTolerancia) || 0
            const p1 = parseFloat(postPrimeiraHoraPreco) || 0
            const pAdd = parseFloat(postAddHoraPreco) || 0
            const ceil = parseFloat(postMaxDiaria) || 0

            // 1. Tolerance Slot
            if (tol > 0) finalSlots.push({ minMinutes: 0, maxMinutes: tol, price: 0 })
            
            // 2. First Hour Slot
            let currentMin = tol
            let stepMin = 60
            finalSlots.push({ minMinutes: currentMin, maxMinutes: stepMin, price: p1 })
            
            currentMin = stepMin
            let currentPrice = p1

            // 3. Additions up to Ceiling
            while(currentPrice < ceil && currentMin < 1440) {
                let nextPrice = currentPrice + pAdd
                if (nextPrice > ceil) nextPrice = ceil // cap at ceiling
                finalSlots.push({ minMinutes: currentMin, maxMinutes: currentMin + 60, price: nextPrice })
                currentPrice = nextPrice
                currentMin += 60
                if (currentPrice === ceil) break
            }

            // 4. Ceiling Slot (covers the rest of the day / indefinitely)
            if (currentPrice === ceil) {
                finalSlots.push({ minMinutes: currentMin, maxMinutes: 99999, price: ceil })
            }
        }
        return finalSlots
    }

    const handleSave = async (activate = false) => {
        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) return

        setErrorMsg(null)
        try {
            const rules = generateSlots()

            const body = {
                tableId: selectedTableId,
                tenantId: tenantId,
                name: editorName,
                vehicleType: editorVehicleType,
                type: editorTab === 'PREPAID' ? 'FIXED_TIME' : 'DURATION',
                billingMode: editorTab,
                slots: rules,
                isActive: activate ? true : editorIsActive
            }

            const res = await fetch('/api/pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error(await res.text())
            alert(activate ? 'Modelo Ativado!' : 'Modelo Salvo!')
            
            fetchTables()
        } catch (error: any) {
            setErrorMsg(error.message || 'Erro ao salvar.')
        }
    }

    const handleCopy = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent selecting the table while copying
        if (!confirm('Deseja criar uma cópia desta tabela?')) return

        try {
            const res = await fetch(`/api/pricing/${id}/copy`, { method: 'POST' })
            if (!res.ok) throw new Error(await res.text())
            
            const newTable = await res.json()
            alert('Cópia criada como rascunho!')
            fetchTables()
            selectTable(newTable)
        } catch (error: any) {
            setErrorMsg('Erro ao copiar: ' + error.message)
        }
    }

    const handleDelete = async () => {
        if (!selectedTableId) return
        if (!confirm('ATENÇÃO: Deseja mesmo excluir esta tabela?\nIsso não afetará os tickets passados criados sob ela.')) return

        try {
            const res = await fetch(`/api/pricing?id=${selectedTableId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error(await res.text())
            
            alert('Tabela Excluída com Sucesso!')
            setSelectedTableId(null)
            setEditorName('')
            fetchTables()
        } catch (error: any) {
            setErrorMsg('Erro ao excluir: ' + error.message)
        }
    }

    useEffect(() => {
        fetchTables()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Modelos de Cobrança (Motor de Preços)</h2>
                    <p className="text-gray-400 text-sm">Crie lógicas separadas para Carros e Motos, Pós-pago ou Eventos.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleNewTable('POSTPAID')} className="bg-blue-600/20 text-blue-500 border border-blue-500/50 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
                        <Clock className="w-4 h-4" /> Novo Rotativo
                    </button>
                    <button onClick={() => handleNewTable('PREPAID')} className="bg-purple-600/20 text-purple-500 border border-purple-500/50 hover:bg-purple-500 hover:text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
                        <Calendar className="w-4 h-4" /> Novo Pré-pago/Evento
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* List Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Car Models */}
                    <div className="bg-stone-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                        <div className="bg-stone-800 p-4 border-b border-white/5 font-bold text-sm tracking-widest text-stone-400 uppercase flex items-center gap-2">
                            <Car className="w-4 h-4" /> Modelos (Carro)
                        </div>
                        <div className="divide-y divide-white/5">
                            {tables.filter(t => t.vehicleType === 'CAR').map(table => (
                                <button key={table.id} onClick={() => selectTable(table)} className={`w-full text-left p-4 hover:bg-white/5 transition flex justify-between items-center ${selectedTableId === table.id ? 'bg-white/5 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}>
                                    <div>
                                        <div className={`font-bold ${selectedTableId === table.id ? 'text-white' : 'text-gray-300'}`}>{table.name}</div>
                                        <div className="text-xs text-stone-500 font-mono mt-1">{table.billingMode === 'PREPAID' ? 'PRÉ-PAGO / FIXO' : 'ROTATIVO'}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => handleCopy(table.id, e)} className="p-2 hover:bg-white/10 rounded-lg text-stone-500 hover:text-white transition" title="Copiar Tabela">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        {table.isActive && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                </button>
                            ))}
                            {tables.filter(t => t.vehicleType === 'CAR').length === 0 && <div className="p-4 text-center text-sm text-stone-600">Nenhum criado.</div>}
                        </div>
                    </div>

                    {/* Moto Models */}
                    <div className="bg-stone-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                        <div className="bg-stone-800 p-4 border-b border-white/5 font-bold text-sm tracking-widest text-stone-400 uppercase flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 16v-4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v4M12 10a4 4 0 1 0-8 0 4 4 0 0 0 8 0z"></path></svg> 
                            Modelos (Moto)
                        </div>
                        <div className="divide-y divide-white/5">
                            {tables.filter(t => t.vehicleType === 'MOTO').map(table => (
                                <button key={table.id} onClick={() => selectTable(table)} className={`w-full text-left p-4 hover:bg-white/5 transition flex justify-between items-center ${selectedTableId === table.id ? 'bg-white/5 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}>
                                    <div>
                                        <div className={`font-bold ${selectedTableId === table.id ? 'text-white' : 'text-gray-300'}`}>{table.name}</div>
                                        <div className="text-xs text-stone-500 font-mono mt-1">{table.billingMode === 'PREPAID' ? 'PRÉ-PAGO / FIXO' : 'ROTATIVO'}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => handleCopy(table.id, e)} className="p-2 hover:bg-white/10 rounded-lg text-stone-500 hover:text-white transition" title="Copiar Tabela">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        {table.isActive && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                </button>
                            ))}
                            {tables.filter(t => t.vehicleType === 'MOTO').length === 0 && <div className="p-4 text-center text-sm text-stone-600">Nenhum criado.</div>}
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="lg:col-span-8 bg-stone-900 border border-white/5 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                    {!selectedTableId && !editorName && (
                         <div className="absolute inset-0 bg-stone-900/80 backdrop-blur flex items-center justify-center z-10">
                            <div className="text-stone-500 font-bold flex flex-col items-center">
                                <Clock className="w-12 h-12 mb-2 opacity-20" />
                                Escolha no menu ou crie uma nova tabela ao lado.
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between border-b border-white/10 pb-6 mb-6">
                        <div className="flex gap-4 items-center">
                            <div className={`p-3 rounded-xl ${editorTab === 'PREPAID' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                {editorTab === 'PREPAID' ? <Calendar className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{editorTab === 'PREPAID' ? 'Regra Pré-paga / Evento' : 'Regra Rotativa (Pós-pago)'}</h3>
                                <p className="text-gray-400 text-sm">Configurando lógicas de cobrança</p>
                            </div>
                        </div>
                        {selectedTableId && (
                            <button onClick={handleDelete} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition flex items-center gap-2" title="Excluir Tabela">
                                <Trash2 className="w-5 h-5" />
                                <span className="font-bold text-sm hidden md:inline">Excluir</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2 pl-1">Nome de Identificação</label>
                            <input className="bg-black border border-white/10 focus:border-white/30 rounded-xl px-4 h-12 text-white w-full font-bold outline-none" value={editorName} onChange={e => setEditorName(e.target.value)} placeholder="Ex: Diária Promocional" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2 pl-1">Veículo Alvo</label>
                            <select className="bg-black border border-white/10 rounded-xl px-4 h-12 text-white w-full font-bold outline-none" value={editorVehicleType} onChange={e => setEditorVehicleType(e.target.value)}>
                                <option value="CAR">Carros (Apenas)</option>
                                <option value="MOTO">Motos (Apenas)</option>
                            </select>
                        </div>
                    </div>

                    {/* POSTPAID Dynamic Form */}
                    {editorTab === 'POSTPAID' && (
                        <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 mb-8">
                            <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Valores do Pátio</h4>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-stone-400">Tempo de Tolerância (Minutos Reais)</label>
                                        <div className="flex bg-black rounded-lg border border-white/10 overflow-hidden items-center mt-1">
                                            <input type="number" className="bg-transparent h-12 px-4 w-full text-white font-bold outline-none" value={postTolerancia} onChange={e => setPostTolerancia(e.target.value)} />
                                            <span className="px-4 text-stone-500 text-sm font-mono tracking-widest">MIN</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400">Valor Máximo Cobrado (Teto/Diária)</label>
                                        <div className="flex bg-black rounded-lg border border-white/10 overflow-hidden items-center mt-1">
                                            <span className="px-4 text-stone-500 font-bold">R$</span>
                                            <input type="number" className="bg-transparent h-12 w-full text-emerald-400 font-bold text-xl outline-none" value={postMaxDiaria} onChange={e => setPostMaxDiaria(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-stone-400">Valor Cobrado na 1ª Hora (Cheia)</label>
                                        <div className="flex bg-black rounded-lg border border-white/10 overflow-hidden items-center mt-1">
                                            <span className="px-4 text-stone-500 font-bold">R$</span>
                                            <input type="number" className="bg-transparent h-12 w-full text-white font-bold text-xl outline-none" value={postPrimeiraHoraPreco} onChange={e => setPostPrimeiraHoraPreco(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400">Acréscimo por cada Múltiplo de 1 Hr Adicional</label>
                                        <div className="flex bg-black rounded-lg border border-white/10 overflow-hidden items-center mt-1">
                                            <span className="px-4 text-stone-500 font-bold">+R$</span>
                                            <input type="number" className="bg-transparent h-12 w-full text-white font-bold outline-none" value={postAddHoraPreco} onChange={e => setPostAddHoraPreco(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PREPAID Dynamic Form */}
                    {editorTab === 'PREPAID' && (
                        <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6 mb-8">
                            <h4 className="text-purple-400 font-bold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Turnos (Sem cobrança em cascata)</h4>
                            
                            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-4">
                                <Ban className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
                                <div>
                                    <h5 className="font-bold text-orange-500">Comprovante de Estorno (Tolerância)</h5>
                                    <p className="text-stone-300 text-sm mt-1">Como você cobra na entrada, se uma placa bater na Cancela de Saída antes da tolerância abaixo, o Totem/Operador imprimirá um "Voucher de Estorno Integral" e limpará o faturamento deste ticket para segurança e coesão contra fraudes de gaveta.</p>
                                    <div className="flex items-center gap-2 mt-4">
                                        <span className="text-stone-400 font-bold text-sm">Minutos de Tolerância:</span>
                                        <input type="number" className="bg-black border border-white/10 rounded px-2 w-20 text-center font-bold text-white h-8" value={preTolerancia} onChange={e => setPreTolerancia(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {preTurnos.map((turno, idx) => (
                                    <div key={idx} className="flex gap-4 items-center bg-black/50 p-3 rounded-lg border border-white/5">
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs font-bold text-white uppercase w-8">Das</span>
                                            <input type="text" placeholder="00:00" value={turno.startTime} onChange={e => {
                                                const n = [...preTurnos]; n[idx].startTime = e.target.value; setPreTurnos(n);
                                            }} className="bg-black border border-white/10 rounded w-20 text-center h-8 font-bold text-stone-300" />
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs font-bold text-white uppercase w-8">Até as</span>
                                            <input type="text" placeholder="23:59" value={turno.endTime} onChange={e => {
                                                const n = [...preTurnos]; n[idx].endTime = e.target.value; setPreTurnos(n);
                                            }} className="bg-black border border-white/10 rounded w-20 text-center h-8 font-bold text-stone-300" />
                                        </div>
                                        <div className="flex gap-2 items-center flex-1 justify-end">
                                            <span className="text-xs font-bold text-emerald-500 uppercase">Custa R$</span>
                                            <input type="number" value={turno.price} onChange={e => {
                                                const n = [...preTurnos]; n[idx].price = e.target.value; setPreTurnos(n);
                                            }} className="bg-black border border-emerald-500/30 rounded w-28 text-center h-10 font-bold text-emerald-400 text-lg" step="0.50" />
                                        </div>
                                        <button onClick={() => setPreTurnos(preTurnos.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <button onClick={handleAddTurno} className="text-sm font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 p-2">
                                    + Adicionar Novo Padrão de Horário (Turno)
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-white/5 pt-6 mt-4">
                         {!editorIsActive && selectedTableId && (
                            <button onClick={() => handleSave(true)} className="bg-stone-800 hover:bg-emerald-600 hover:border-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition border border-white/10">
                                <CheckCircle className="w-5 h-5" /> Ativar Definitivamente (Para {editorVehicleType === 'CAR' ? 'Carros' : 'Motos'})
                            </button>
                        )}
                        <button onClick={() => handleSave(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition">
                            <Save className="w-5 h-5" /> Salvar Rascunho
                        </button>
                    </div>

                    {errorMsg && <div className="mt-4 text-red-500 font-bold text-sm text-right">{errorMsg}</div>}
                </div>
            </div>
        </div>
    )
}
