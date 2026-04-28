"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, MapPin, Phone, Save, ArrowLeft } from 'lucide-react'

export default function NewOwnerPage() {
    const router = useRouter()

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        document: '', // CPF/CNPJ
        email: '',
        phone: '',
        address: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/admin/owners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const err = await res.json()
                alert(`Erro: ${err.error}`)
                return
            }

            alert("Proprietário cadastrado com sucesso!")
            router.push('/admin/owners')
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Erro ao conectar com o servidor.")
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-white mb-6 text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>

            <h1 className="text-3xl font-bold mb-2">Novo Proprietário</h1>
            <p className="text-gray-400 mb-8">Cadastro de Pessoa Física ou Jurídica para gestão de ativos.</p>

            <form onSubmit={handleSubmit} className="bg-stone-900 border border-white/10 p-8 rounded-2xl shadow-xl">

                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                        <User className="text-purple-500 w-5 h-5" />
                        <h2 className="text-lg font-bold">Dados Principais</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-2">Nome Completo / Razão Social</label>
                            <input
                                type="text"
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="Ex: João Silva ou Silva Park Ltda"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">CPF / CNPJ</label>
                            <input
                                type="text"
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="000.000.000-00"
                                value={formData.document}
                                onChange={e => setFormData({ ...formData, document: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Telefone Principal</label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:border-purple-500 outline-none"
                                    placeholder="(00) 00000-0000"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 mt-8 pb-4 border-b border-white/5">
                        <MapPin className="text-purple-500 w-5 h-5" />
                        <h2 className="text-lg font-bold">Contato e Endereço</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">E-mail Corporativo</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                                <input
                                    type="email"
                                    className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:border-purple-500 outline-none"
                                    placeholder="contato@empresa.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Endereço (Opcional)</label>
                            <textarea
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none h-24"
                                placeholder="Endereço da sede administrativa..."
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/5 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <Save className="w-4 h-4" /> Cadastrar Proprietário
                    </button>
                </div>

            </form>
        </div>
    )
}
