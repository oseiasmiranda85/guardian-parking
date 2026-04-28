"use client"

import React from 'react'
import Link from 'next/link'
import { Plus, Shield, Mail, Calendar } from 'lucide-react'



export default function AdminsListPage() {
    const [admins, setAdmins] = React.useState<any[]>([])
    const [showModal, setShowModal] = React.useState(false)
    const [editingAdmin, setEditingAdmin] = React.useState<any>(null)
    const [formData, setFormData] = React.useState({ name: '', email: '', password: '' })

    const fetchAdmins = async () => {
        const res = await fetch('/api/admin/admins', { cache: 'no-store' })
        const data = await res.json()
        if (Array.isArray(data)) setAdmins(data)
    }

    React.useEffect(() => {
        fetchAdmins()
    }, [])

    const handleNew = () => {
        setEditingAdmin(null)
        setFormData({ name: '', email: '', password: '' })
        setShowModal(true)
    }

    const handleEdit = (admin: any) => {
        setEditingAdmin(admin)
        setFormData({ name: admin.name, email: admin.email, password: '' }) // Empty password implies no change
        setShowModal(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza?')) return
        await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' })
        fetchAdmins()
    }

    const handleSave = async () => {
        const url = editingAdmin ? `/api/admin/admins/${editingAdmin.id}` : '/api/admin/admins'
        const method = editingAdmin ? 'PUT' : 'POST'

        const res = await fetch(url, {
            method,
            body: JSON.stringify(formData)
        })

        if (!res.ok) {
            const data = await res.json()
            alert(data.error || 'Erro ao salvar. Verifique os dados.')
            return
        }

        setShowModal(false)
        fetchAdmins()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Administradores Master</h1>
                    <p className="text-gray-400">Usuários com acesso total à plataforma.</p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                >
                    <Plus className="w-4 h-4" />
                    Novo Admin
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {admins.map(admin => (
                    <div key={admin.id} className="bg-stone-900 border border-white/10 rounded-xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <Shield className="w-24 h-24 text-white/5 rotate-12 transform group-hover:scale-110 transition" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center mb-4 border border-red-500/20">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(admin)} className="text-gray-500 hover:text-white">
                                        Editar
                                    </button>
                                    <button onClick={() => handleDelete(admin.id)} className="text-red-900 hover:text-red-500">
                                        Excluir
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">{admin.name}</h3>

                            <div className="space-y-2 mt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Mail className="w-4 h-4" />
                                    {admin.email}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    Desde {new Date(admin.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-stone-900 p-6 rounded-xl w-96 border border-white/10 space-y-4">
                        <h3 className="text-xl font-bold">{editingAdmin ? 'Editar Admin' : 'Novo Admin'}</h3>

                        <input
                            placeholder="Nome"
                            className="w-full bg-black border border-white/20 p-2 rounded text-white"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            placeholder="Email"
                            className="w-full bg-black border border-white/20 p-2 rounded text-white"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                        <input
                            type="password"
                            placeholder={editingAdmin ? "Nova Senha (Opcional)" : "Senha"}
                            className="w-full bg-black border border-white/20 p-2 rounded text-white"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-red-600 rounded text-white font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
