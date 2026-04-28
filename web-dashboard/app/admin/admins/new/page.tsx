"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, Check, ArrowLeft, Save } from 'lucide-react'

export default function NewAdminPage() {
    const router = useRouter()

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.password !== formData.confirmPassword) {
            alert("As senhas não conferem.")
            return
        }
        // Mock API Call
        console.log("Creating Admin:", formData)
        alert("Administrador cadastrado com sucesso!")
        router.push('/admin/admins')
    }

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-white mb-6 text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>

            <h1 className="text-3xl font-bold mb-2">Novo Administrador Master</h1>
            <p className="text-gray-400 mb-8">Concede acesso TOTAL à plataforma de gestão.</p>

            <form onSubmit={handleSubmit} className="bg-stone-900 border border-white/10 p-8 rounded-2xl shadow-xl">

                <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3">
                        <Shield className="w-6 h-6 text-red-500 mt-1" />
                        <div>
                            <h3 className="font-bold text-red-500 text-sm">Atenção: Acesso Irrestrito</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                Este usuário terá permissão para visualizar faturamento global, bloquear clientes e editar configurações críticas do sistema.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Nome Completo</label>
                        <input
                            type="text"
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                            placeholder="Ex: Maria Admin"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">E-mail de Acesso</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                            <input
                                type="email"
                                className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:border-red-500 outline-none"
                                placeholder="admin@sistema.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Senha</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                                <input
                                    type="password"
                                    className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:border-red-500 outline-none"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Confirmar Senha</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
                                <input
                                    type="password"
                                    className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-3 py-3 text-white focus:border-red-500 outline-none"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition shadow-lg shadow-red-900/20"
                    >
                        <Save className="w-4 h-4" /> Cadastrar Admin
                    </button>
                </div>

            </form>
        </div>
    )
}
