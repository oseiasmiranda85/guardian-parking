"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Building, CreditCard, Check, ArrowLeft, ArrowRight, Save, FileText, Key, Copy, Sparkles } from 'lucide-react'

// Steps Definition
const STEPS = [
    { id: 1, label: 'Proprietário', icon: User },
    { id: 2, label: 'Estacionamento', icon: Building },
    { id: 3, label: 'Contrato', icon: CreditCard },
    { id: 4, label: 'Confirmação', icon: FileText },
]

export default function NewTenantWizard() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Data Lists
    const [ownersList, setOwnersList] = useState<any[]>([])

    // Form State
    const [formData, setFormData] = useState({
        // 1. Owner
        ownerName: '',
        ownerDocument: '',
        ownerEmail: '',
        ownerPhone: '',
        createOwner: true,

        // 2. Tenant
        tenantName: '',
        tenantAddress: '',
        totalSpots: '50',
        tenantType: 'ESTACIONAMENTO',
        latitude: '',
        longitude: '',

        // 3. Finance
        planType: 'RECURRING', // RECURRING or ONE_TIME
        planValue: '', // Raw string for display? Store float logic separately
        referenceMonth: '' // Optional start month
    })

    const [formattedValue, setFormattedValue] = useState('')

    // Success State
    const [successData, setSuccessData] = useState<{ username: string, password: string } | null>(null)

    React.useEffect(() => {
        // Load Owners for Step 1
        fetch('/api/admin/owners').then(res => res.json()).then(data => {
            if (Array.isArray(data)) setOwnersList(data)
        })
    }, [])

    // --- Logic ---

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4))
    const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1))

    const handleGeocode = async () => {
        if (!formData.tenantAddress) {
            alert('Digite o endereço primeiro.')
            return
        }
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.tenantAddress)}`)
            const data = await res.json()
            if (data && data.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    latitude: data[0].lat,
                    longitude: data[0].lon
                }))
            } else {
                alert('Local não encontrado via busca automática. Preencha a latitude/longitude manualmente.')
            }
        } catch (error) {
            console.error(error)
            alert('Falha na busca de coordenadas.')
        }
    }

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '')
        const float = parseInt(raw || '0') / 100
        setFormData({ ...formData, planValue: float.toString() })
        setFormattedValue(float.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
    }

    // Generate Invoice Preview
    const getInvoicePreview = () => {
        const count = formData.planType === 'RECURRING' ? 12 : 1
        const invoices = []
        const today = new Date()
        const value = parseFloat(formData.planValue || '0')

        for (let i = 0; i < count; i++) {
            const date = new Date(today)
            date.setMonth(today.getMonth() + i)
            invoices.push({
                index: i + 1,
                date: date.toLocaleDateString('pt-BR'),
                value: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                status: 'PENDING'
            })
        }
        return invoices
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao criar')
            }

            const data = await res.json()
            setSuccessData(data.credentials)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    // --- Render ---

    if (successData) {
        return (
            <div className="max-w-2xl mx-auto mt-20 fade-in">
                <div className="bg-stone-900/80 backdrop-blur-xl border border-green-500/30 p-10 rounded-3xl text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-emerald-400"></div>

                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-400 ring-4 ring-green-500/20 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                        <Check className="w-12 h-12" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-2">Sucesso!</h2>
                    <p className="text-gray-400 mb-10 text-lg">Estacionamento configurado e ativo.</p>

                    <div className="bg-black/50 p-8 rounded-2xl border border-white/5 text-left mb-10 relative group hover:border-white/20 transition-colors">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Key className="w-4 h-4" /> Credenciais de Acesso
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-stone-800/50 p-4 rounded-xl">
                                <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Usuário Gerente</label>
                                <div className="text-2xl font-mono text-white select-all font-bold tracking-tight">{successData.username}</div>
                            </div>
                            <div className="bg-stone-800/50 p-4 rounded-xl">
                                <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Senha Provisória</label>
                                <div className="text-2xl font-mono text-white select-all font-bold tracking-tight text-emerald-400">{successData.password}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/admin/tenants')}
                            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition text-lg shadow-xl"
                        >
                            Ir para Painel de Controle
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto py-8">
            <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-white mb-8 text-sm font-medium transition-colors group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Cancelar e Voltar
            </button>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-12 relative px-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-800 -z-10 transform -translate-y-1/2 rounded-full"></div>
                <div
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-red-600 to-red-400 -z-10 transform -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                ></div>

                {STEPS.map((step) => {
                    const isActive = step.id === currentStep
                    const isCompleted = step.id < currentStep
                    const Icon = step.icon
                    return (
                        <div key={step.id} className="flex flex-col items-center relative group cursor-default">
                            <div className={`w-14 h-14 rounded-2xl rotate-45 flex items-center justify-center border-2 transition-all duration-300 shadow-xl ${isActive ? 'border-red-500 bg-red-600 text-white scale-110 shadow-red-900/30' :
                                isCompleted ? 'border-green-500 bg-black text-green-500' :
                                    'border-stone-800 bg-stone-900 text-stone-600'
                                }`}>
                                <div className="-rotate-45">
                                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                </div>
                            </div>
                            <span className={`absolute -bottom-10 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-white translate-y-0' : 'text-stone-600'}`}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Content Card */}
            <div className="bg-stone-900/60 backdrop-blur-md border border-white/5 p-10 rounded-3xl min-h-[500px] shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* STEP 1: PROPRIETÁRIO */}
                {currentStep === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-500">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">Quem é o Cliente?</h2>
                                <p className="text-gray-400">Informe os dados da pessoa física ou jurídica.</p>
                            </div>
                            <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, createOwner: true })}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg ${formData.createOwner ? 'bg-red-600 text-white shadow-red-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    Novo Cadastro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, createOwner: false })}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg ${!formData.createOwner ? 'bg-red-600 text-white shadow-red-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    Buscar Existente
                                </button>
                            </div>
                        </div>

                        {!formData.createOwner && (
                            <div className="relative">
                                <select
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 hover:border-white/30 rounded-xl px-4 text-sm text-white focus:border-red-600 outline-none transition-colors appearance-none cursor-pointer"
                                    onChange={(e) => {
                                        const selected = ownersList.find(o => o.id === parseInt(e.target.value))
                                        if (selected) {
                                            setFormData({
                                                ...formData,
                                                ownerName: selected.name,
                                                ownerDocument: selected.document,
                                                ownerEmail: selected.email,
                                                ownerPhone: selected.phone || '',
                                                createOwner: false
                                            })
                                        }
                                    }}
                                >
                                    <option value="">Selecione um Proprietário na lista...</option>
                                    {ownersList.map((owner: any) => (
                                        <option key={owner.id} value={owner.id}>{owner.name} ({owner.document})</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!formData.createOwner ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Nome Completo / Razão Social</label>
                                <input
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.ownerName}
                                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Documento (CPF/CNPJ)</label>
                                <input
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.ownerDocument}
                                    onChange={e => setFormData({ ...formData, ownerDocument: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">E-mail Profissional</label>
                                <input
                                    type="email"
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.ownerEmail}
                                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Telefone / WhatsApp</label>
                                <input
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.ownerPhone}
                                    onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: ESTACIONAMENTO */}
                {currentStep === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="border-b border-white/5 pb-4 mb-4">
                            <h2 className="text-3xl font-bold text-white mb-2">Infraestrutura</h2>
                            <p className="text-gray-400">Detalhes da unidade de estacionamento.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Nome da Unidade</label>
                                <input
                                    placeholder="Ex: Unidade Centro"
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.tenantName}
                                    onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Capacidade (Vagas)</label>
                                <input
                                    type="number"
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner font-mono"
                                    value={formData.totalSpots}
                                    onChange={e => setFormData({ ...formData, totalSpots: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Endereço Completo</label>
                                <div className="flex gap-2">
                                    <input
                                        placeholder="Rua, Número - Bairro"
                                        className="flex-1 h-12 bg-[#0a0a0a] border border-white/10 focus:border-red-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                        value={formData.tenantAddress}
                                        onChange={e => setFormData({ ...formData, tenantAddress: e.target.value })}
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleGeocode}
                                        className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold flex items-center justify-center transition"
                                        title="Buscar Coordenadas pelo Endereço"
                                    >
                                        📍 Buscar no Mapa
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Latitude</label>
                                <input
                                    placeholder="-23.5505"
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-blue-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.latitude}
                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-500 text-xs mb-2 font-bold uppercase tracking-widest pl-1">Longitude</label>
                                <input
                                    placeholder="-46.6333"
                                    className="w-full h-12 bg-[#0a0a0a] border border-white/10 focus:border-blue-600 rounded-xl px-4 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-300 ease-out shadow-inner"
                                    value={formData.longitude}
                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-gray-500 text-xs mb-4 font-bold uppercase tracking-widest pl-1">Tipo de Estabelecimento</label>
                                <div className="flex gap-6 p-1 bg-black/30 rounded-2xl border border-white/5">
                                    <button
                                        onClick={() => setFormData({ ...formData, tenantType: 'ESTACIONAMENTO' })}
                                        className={`flex-1 p-5 rounded-xl border-2 text-left transition-all ${formData.tenantType === 'ESTACIONAMENTO' ? 'border-red-500 bg-red-500/10' : 'border-transparent hover:bg-white/5'}`}
                                    >
                                        <div className={`font-bold mb-1 ${formData.tenantType === 'ESTACIONAMENTO' ? 'text-red-500' : 'text-gray-400'}`}>Estacionamento Fixo</div>
                                        <div className="text-xs text-gray-500">Operação contínua e mensalistas</div>
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, tenantType: 'EVENTO' })}
                                        className={`flex-1 p-5 rounded-xl border-2 text-left transition-all ${formData.tenantType === 'EVENTO' ? 'border-red-500 bg-red-500/10' : 'border-transparent hover:bg-white/5'}`}
                                    >
                                        <div className={`font-bold mb-1 ${formData.tenantType === 'EVENTO' ? 'text-red-500' : 'text-gray-400'}`}>Evento Temporário</div>
                                        <div className="text-xs text-gray-500">Duração limitada e taxa fixa</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: CONTRATO */}
                {currentStep === 3 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="border-b border-white/5 pb-4 mb-4">
                            <h2 className="text-3xl font-bold text-white mb-2">Financeiro</h2>
                            <p className="text-gray-400">Defina a regra de cobrança para este contrato.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div
                                onClick={() => setFormData({ ...formData, planType: 'RECURRING' })}
                                className={`cursor-pointer p-8 rounded-2xl border-2 transition-all hover:scale-[1.02] ${formData.planType === 'RECURRING' ? 'border-red-500 bg-red-900/10 shadow-lg shadow-red-900/10' : 'border-white/5 bg-stone-800/30 grayscale hover:grayscale-0'}`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-xl ${formData.planType === 'RECURRING' ? 'bg-red-500 text-white' : 'bg-stone-700 text-gray-400'}`}>
                                        <CreditCard className="w-8 h-8" />
                                    </div>
                                    {formData.planType === 'RECURRING' && <div className="bg-red-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Plano Mensal</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Cobrança recorrente todo mês. O sistema gera automaticamente as faturas dos próximos 12 meses.
                                </p>
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, planType: 'ONE_TIME' })}
                                className={`cursor-pointer p-8 rounded-2xl border-2 transition-all hover:scale-[1.02] ${formData.planType === 'ONE_TIME' ? 'border-red-500 bg-red-900/10 shadow-lg shadow-red-900/10' : 'border-white/5 bg-stone-800/30 grayscale hover:grayscale-0'}`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-xl ${formData.planType === 'ONE_TIME' ? 'bg-red-500 text-white' : 'bg-stone-700 text-gray-400'}`}>
                                        <Sparkles className="w-8 h-8" />
                                    </div>
                                    {formData.planType === 'ONE_TIME' && <div className="bg-red-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Taxa de Evento</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Cobrança única para um período específico. Validade de 30 dias e apenas 1 fatura gerada.
                                </p>
                            </div>
                        </div>

                        <div className="bg-black/40 p-8 rounded-2xl border border-white/10">
                            <label className="text-gray-400 text-sm mb-4 block font-bold uppercase tracking-wider">
                                Valor {formData.planType === 'RECURRING' ? 'da Mensalidade' : 'Total do Evento'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-500">R$</span>
                                <input
                                    type="text"
                                    className="w-full bg-[#0a0a0a] text-4xl font-bold text-white border-2 border-white/10 rounded-xl py-6 pl-20 pr-6 outline-none focus:border-emerald-500 transition-colors font-mono shadow-inner"
                                    placeholder="0,00"
                                    value={formattedValue}
                                    onChange={handleValueChange}
                                />
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-4">Digite apenas os números, os centavos são adicionados automaticamente.</p>
                        </div>
                    </div>
                )}

                {/* STEP 4: CONFIRMAÇÃO */}
                {currentStep === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-1">Revisão Final</h2>
                                <p className="text-gray-400">Confira os dados antes de gerar o contrato.</p>
                            </div>
                            {formData.planType === 'RECURRING'
                                ? <span className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 tracking-wider">MENSALIDADE</span>
                                : <span className="px-4 py-2 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20 tracking-wider">EVENTO ÚNICO</span>
                            }
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="bg-stone-800/40 p-6 rounded-2xl border border-white/5">
                                <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-4">Proprietário</h3>
                                <p className="text-white text-xl font-bold mb-1">{formData.ownerName}</p>
                                <p className="text-gray-400 font-mono">{formData.ownerDocument}</p>
                            </div>
                            <div className="bg-stone-800/40 p-6 rounded-2xl border border-white/5">
                                <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-4">Estacionamento</h3>
                                <p className="text-white text-xl font-bold mb-1">{formData.tenantName}</p>
                                <p className="text-gray-400">{formData.totalSpots} Vagas • {formData.tenantAddress}</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-3 text-white">
                                <FileText className="text-emerald-500" />
                                Faturamento Programado <span className="bg-stone-800 text-xs py-1 px-2 rounded text-gray-400">{getInvoicePreview().length} Parcelas</span>
                            </h3>

                            <div className="bg-black/50 border border-white/10 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto custom-scrollbar shadow-inner">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-stone-900/80 backdrop-blur text-gray-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 font-bold border-b border-white/10">#</th>
                                            <th className="p-4 font-bold border-b border-white/10">Data de Vencimento</th>
                                            <th className="p-4 font-bold border-b border-white/10">Valor Previsto</th>
                                            <th className="p-4 font-bold border-b border-white/10 text-right">Status Inicial</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {getInvoicePreview().map((inv) => (
                                            <tr key={inv.index} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-gray-500 font-mono">{String(inv.index).padStart(2, '0')}</td>
                                                <td className="p-4 text-white font-medium">{inv.date}</td>
                                                <td className="p-4 text-emerald-400 font-bold font-mono">{inv.value}</td>
                                                <td className="p-4 text-right">
                                                    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide">
                                                        PENDENTE
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between mt-10 px-4">
                <button
                    onClick={handlePrev}
                    disabled={currentStep === 1}
                    className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <ArrowLeft className="w-5 h-5" /> Voltar
                </button>

                {currentStep < 4 ? (
                    <button
                        onClick={handleNext}
                        disabled={
                            (currentStep === 1 && !formData.ownerName) ||
                            (currentStep === 2 && !formData.tenantName) ||
                            (currentStep === 3 && !formData.planValue)
                        }
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-1"
                    >
                        Continuar <ArrowRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-16 py-4 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:-translate-y-1"
                    >
                        {loading ? 'Processando...' : 'Confirmar Criação'} <Check className="w-5 h-5" />
                    </button>
                )}
            </div>


        </div>
    )
}
