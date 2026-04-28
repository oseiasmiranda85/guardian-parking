"use client"

import React, { useState, useEffect } from 'react'
import { Plus, QrCode, Search, Trash2, Download, Tag, Users, Calendar, ShieldCheck, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function PaginaCredenciados() {
    const [activeTab, setActiveTab] = useState<'PERSONAS' | 'CATEGORIES'>('PERSONAS')
    const [personas, setPersonas] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    
    // Modals
    const [showPersonaModal, setShowPersonaModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [showQrModal, setShowQrModal] = useState<any>(null)
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(0) // 0: Hidden, 1: First Confirm, 2: Final Confirm
    const [importSummary, setImportSummary] = useState<any>(null)

    // Form States
    const [name, setName] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [validUntil, setValidUntil] = useState('')
    const [categoryName, setCategoryName] = useState('')

    const tenantId = typeof window !== 'undefined' ? sessionStorage.getItem('current_tenant_id') : null

    const fetchData = async () => {
        if (!tenantId) return
        setLoading(true)
        try {
            const [pRes, cRes] = await Promise.all([
                fetch(`/api/accredited?tenantId=${tenantId}`),
                fetch(`/api/accredited/categories?tenantId=${tenantId}`)
            ])
            const pData = await pRes.json()
            const cData = await cRes.json()
            if (Array.isArray(pData)) setPersonas(pData)
            if (Array.isArray(cData)) setCategories(cData)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [tenantId])

    const handleSaveCategory = async () => {
        if (!categoryName || !tenantId) return
        try {
            const res = await fetch('/api/accredited/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, name: categoryName })
            })
            if (res.ok) {
                setCategoryName('')
                setShowCategoryModal(false)
                fetchData()
            } else {
                const err = await res.json()
                alert(`Erro: ${err.error}`)
            }
        } catch (error) { console.error(error) }
    }

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Excluir esta categoria? Personas vinculadas podem ser afetadas.')) return
        try {
            await fetch(`/api/accredited/categories?id=${id}`, { method: 'DELETE' })
            fetchData()
        } catch (error) { console.error(error) }
    }

    const handleSavePersona = async () => {
        if (!name || !categoryId || !validUntil) return
        try {
            const res = await fetch('/api/accredited', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, name, categoryId, validUntil })
            })
            if (res.ok) {
                setName('')
                setCategoryId('')
                setValidUntil('')
                setShowPersonaModal(false)
                fetchData()
            }
        } catch (error) { console.error(error) }
    }

    const handleDeleteAll = async () => {
        try {
            const res = await fetch(`/api/accredited/bulk-delete?tenantId=${tenantId}`, { method: 'DELETE' })
            if (res.ok) {
                setShowBulkDeleteConfirm(0)
                fetchData()
                alert("Todos os registros foram apagados.")
            }
        } catch (error) { console.error(error) }
    }

    const handleExportCsv = () => {
        const header = "Nome,Categoria,Token,Validade,Status\n"
        const rows = personas.map(p => 
            `"${p.nome}","${p.tipo}","${p.qrToken}","${new Date(p.validUntil).toLocaleDateString()}","${p.status}"`
        ).join("\n")
        
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `credenciados_${tenantId}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n').slice(1) // Skip header
            const items = lines.map(line => {
                const parts = line.split(',').map(p => p.replace(/"/g, '').trim())
                if (parts.length < 2) return null
                return {
                    name: parts[0],
                    categoryName: parts[1],
                    validUntil: parts[3] ? new Date(parts[3]).toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
                    status: parts[4] === 'Inativo' ? 'INACTIVE' : 'ACTIVE'
                }
            }).filter(Boolean)

            if (items.length > 0) {
                const res = await fetch('/api/accredited/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': 'park-master-key' },
                    body: JSON.stringify({ tenantId, items })
                })
                if (res.ok) {
                    const data = await res.json()
                    setImportSummary(data.summary)
                    fetchData()
                }
            }
        }
        reader.readAsText(file)
    }

    const filteredPersonas = personas.filter(p => 
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.qrToken.includes(searchTerm)
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-stone-500" />
                        Gestão de Credenciados
                    </h2>
                    <p className="text-gray-400 mt-1">Isenção para Personas (Expositores, Sócios e Staff)</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                         <button
                            onClick={() => document.getElementById('csv-input')?.click()}
                            className="flex items-center gap-2 bg-stone-900 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:bg-stone-800 transition"
                        >
                            <Upload className="w-4 h-4 text-stone-500" /> Importar CSV
                        </button>
                        <input type="file" id="csv-input" className="hidden" accept=".csv" onChange={handleImportCsv} />
                        
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-2 bg-stone-900 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:bg-stone-800 transition"
                        >
                            <Download className="w-4 h-4 text-stone-500" /> Exportar CSV
                        </button>

                         <button
                            onClick={() => setShowBulkDeleteConfirm(1)}
                            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/20 transition"
                        >
                            <Trash2 className="w-4 h-4" /> Apagar Tudo
                        </button>
                    </div>

                    <button
                        onClick={() => activeTab === 'PERSONAS' ? setShowPersonaModal(true) : setShowCategoryModal(true)}
                        className="flex items-center gap-2 bg-stone-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-stone-400 transition-all shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{activeTab === 'PERSONAS' ? 'Novo Credenciado' : 'Nova Categoria'}</span>
                    </button>
                </div>
            </div>

            {/* Import Summary Toast */}
            {importSummary && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className="text-sm">
                            <span className="text-emerald-500 font-bold">Importação concluída!</span>
                            <span className="text-gray-400 ml-2">Sucesso: {importSummary.created} criados, {importSummary.updated} atualizados.</span>
                        </div>
                    </div>
                    <button onClick={() => setImportSummary(null)} className="text-xs text-gray-500 hover:text-white uppercase font-bold px-3 py-1">Fechar</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-white/10 gap-8">
                <button 
                    onClick={() => setActiveTab('PERSONAS')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'PERSONAS' ? 'text-stone-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Personas ({personas.length})
                    </div>
                    {activeTab === 'PERSONAS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-500 rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('CATEGORIES')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'CATEGORIES' ? 'text-stone-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Categorias Fixas
                    </div>
                    {activeTab === 'CATEGORIES' && <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-500 rounded-t-full"></div>}
                </button>
            </div>

            {activeTab === 'PERSONAS' ? (
                <>
                    <div className="bg-stone-900/50 border border-white/5 rounded-2xl p-4 flex gap-4 backdrop-blur-sm">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nome ou token da credencial..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-stone-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-stone-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-gray-400">
                                <tr>
                                    <th className="p-5 font-semibold">Nome do Credenciado</th>
                                    <th className="p-5 font-semibold">Categoria</th>
                                    <th className="p-5 font-semibold">Token (14 dígitos)</th>
                                    <th className="p-5 font-semibold text-center">Validade</th>
                                    <th className="p-5 font-semibold text-center">Status</th>
                                    <th className="p-5 font-semibold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-gray-500">Carregando dados...</td></tr>
                                ) : filteredPersonas.length === 0 ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-gray-500">Nenhum credenciado encontrado.</td></tr>
                                ) : filteredPersonas.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-5">
                                            <div className="font-bold text-white group-hover:text-stone-500 transition-colors uppercase">{user.nome}</div>
                                        </td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 rounded-lg bg-stone-500/10 text-stone-500 text-[10px] font-bold border border-stone-500/20 uppercase">
                                                {user.tipo}
                                            </span>
                                        </td>
                                        <td className="p-5 font-mono text-xs text-gray-400 tracking-widest">
                                            {user.qrToken.match(/.{1,4}/g)?.join(' ')}
                                        </td>
                                        <td className="p-5 text-center text-gray-400">
                                            {new Date(user.validUntil).toLocaleDateString()}
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${user.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => setShowQrModal(user)}
                                                className="p-3 hover:bg-stone-500 hover:text-black rounded-xl text-stone-500 transition-all shadow-md"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="bg-stone-900 border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-gray-400">
                                <tr>
                                    <th className="p-5">Nome da Categoria</th>
                                    <th className="p-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-white/5">
                                        <td className="p-5 font-bold text-white uppercase tracking-wider">{cat.name}</td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Nova Categoria */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6 text-white">Nova Categoria</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome da Categoria</label>
                                <input 
                                    type="text" 
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="EX: SÓCIO, EXPOSITOR ..."
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-stone-500"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-4 rounded-xl text-gray-400 font-bold hover:bg-white/5 transition">Cancelar</button>
                                <button onClick={handleSaveCategory} className="flex-1 py-4 bg-stone-500 text-black rounded-xl font-bold hover:bg-stone-400 transition">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Bulk Delete Confirmation */}
            {showBulkDeleteConfirm > 0 && (
                <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-lg">
                    <div className="bg-stone-900 border border-red-500/30 rounded-3xl p-10 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            {showBulkDeleteConfirm === 1 ? "Apagar Tudo?" : "CUIDADO!"}
                        </h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            {showBulkDeleteConfirm === 1 
                                ? "Esta ação irá remover permanentemente todos os credenciados deste estabelecimento. Você não poderá desfazer isso." 
                                : "CONFIRMAÇÃO FINAL: Você realmente deseja excluir toda a base de acessos?"}
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => showBulkDeleteConfirm === 1 ? setShowBulkDeleteConfirm(2) : handleDeleteAll()}
                                className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/30"
                            >
                                {showBulkDeleteConfirm === 1 ? "SIM, CONTINUAR" : "SIM, TENHO CERTEZA!"}
                            </button>
                            <button 
                                onClick={() => setShowBulkDeleteConfirm(0)}
                                className="w-full py-4 bg-white/5 text-gray-400 font-bold rounded-2xl hover:bg-white/10 transition"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ... Modal: Novo Credenciado & Modal: QR Code (Keep existing) ... */}
            {/* [OS MODAIS DE P_MODAL E QR_MODAL FICAM IGUAIS AO ANTERIOR, APENAS ATUALIZANDO O PLACEHOLDER SE NECESSÁRIO] */}
            {showPersonaModal && (
                /* REUTILIZE O MESMO MODAL DE CADASTRAR NOVO PASSE */
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-stone-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6 text-white text-center">Cadastrar Novo Passe</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest text-center">Informações Pessoais</label>
                                <input 
                                    type="text" 
                                    placeholder="Nome Completo do Portador"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-center text-lg focus:outline-none focus:border-stone-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Categoria</label>
                                    <select 
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Expira em:</label>
                                    <input 
                                        type="date" 
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowPersonaModal(false)} className="flex-1 py-4 rounded-xl text-gray-400 font-bold hover:bg-white/5 transition">Cancelar</button>
                                <button onClick={handleSavePersona} className="flex-1 py-4 bg-stone-500 text-black rounded-xl font-bold hover:bg-stone-400 transition">Ativar Credencial</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showQrModal && (
                <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-stone-900 border border-white/10 rounded-[32px] p-10 max-w-sm w-full text-center relative shadow-2xl">
                        <button onClick={() => setShowQrModal(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white bg-white/5 w-8 h-8 rounded-full grid place-items-center">✕</button>
                        <h3 className="text-2xl font-bold text-white italic tracking-tighter mb-4">PASSE DE ISENÇÃO</h3>
                        <div className="bg-white p-6 rounded-[24px] inline-block mb-8">
                             <QrCode className="w-32 h-32 text-black mb-4 mx-auto" />
                             <span className="text-xs font-bold font-mono text-black">{showQrModal.qrToken.match(/.{1,4}/g)?.join(' ')}</span>
                        </div>
                        <div className="text-left bg-black/40 p-4 rounded-xl space-y-2">
                             <span className="text-[9px] text-gray-500 uppercase font-bold">Portador</span>
                             <p className="text-lg font-bold text-white uppercase">{showQrModal.nome}</p>
                             <span className="text-[9px] text-gray-500 uppercase font-bold">Categoria: {showQrModal.tipo}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
