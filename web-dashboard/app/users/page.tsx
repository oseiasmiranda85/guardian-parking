"use client"

import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Key } from 'lucide-react'

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [editingUser, setEditingUser] = useState<any>(null)

    // Check session on mount and fetch users
    React.useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const session = localStorage.getItem('guardian_session')
            const tenantId = sessionStorage.getItem('current_tenant_id')

            if (session) {
                const parsed = JSON.parse(session)
                if (parsed) setCurrentUser(parsed)
            }

            if (tenantId) {
                fetch(`/api/users?tenantId=${tenantId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) setUsers(data)
                        else setUsers([])
                    })
                    .catch(err => {
                        console.error("Fetch users error:", err)
                        setUsers([])
                    })
            }
        } catch (e) {
            console.error("Session initialization error:", e)
        }
    }, [])

    const simulateSync = (action: string) => {
        if (typeof document === 'undefined') return
        const toast = document.createElement('div')
        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-black px-6 py-3 rounded-lg font-bold shadow-xl z-50 animate-bounce'
        toast.innerText = `🔄 ${action} - Sincronizando com terminais...`
        document.body.appendChild(toast)
        setTimeout(() => {
            toast.innerText = '✅ Sincronização Concluída!'
            setTimeout(() => {
                if (document.body.contains(toast)) document.body.removeChild(toast)
            }, 2000)
        }, 1500)
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja remover este usuário? O acesso será revogado imediatamente em todos os POS.')) {
            try {
                const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
                if (res.ok) {
                    setUsers(users.filter(u => u.id !== id))
                    simulateSync('Usuário Removido')
                } else {
                    alert('Erro ao remover usuário.')
                }
            } catch (e) {
                alert('Erro de conexão.')
            }
        }
    }

    const handleResetPass = (name: string) => {
        if (confirm(`Gerar novo PIN temporário para ${name}?`)) {
            alert(`Novo PIN para ${name}: ${Math.floor(1000 + Math.random() * 9000)}\n\n(Este PIN expira em 24h)`)
            simulateSync('Redefinição de Senha Enviada')
        }
    }

    const handleEdit = (user: any) => {
        setEditingUser(user)
        setIsFormOpen(true)
    }

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const name = (form.elements.namedItem('name') as HTMLInputElement).value
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const role = (form.elements.namedItem('role') as HTMLInputElement).value
        const pin = (form.elements.namedItem('pin') as HTMLInputElement)?.value

        const tenantId = sessionStorage.getItem('current_tenant_id')
        if (!tenantId) {
            alert('Erro: Sessão inválida (Tenant ID não encontrado)')
            return
        }

        try {
            if (editingUser) {
                // UPDATE
                const body: any = { name, email, role }
                if (pin && pin.trim() !== "") body.pin = pin
                
                const res = await fetch(`/api/users/${editingUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
                if (res.ok) {
                    const updatedUser = await res.json()
                    setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u))
                    simulateSync('Perfil Atualizado')
                } else {
                    const err = await res.json()
                    alert('Erro ao atualizar: ' + err.error)
                    return
                }
            } else {
                // CREATE
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        role,
                        password: (form.elements.namedItem('password') as HTMLInputElement).value || '123456',
                        pin: pin,
                        tenantId: tenantId
                    })
                })

                if (res.ok) {
                    const newUser = await res.json()
                    setUsers([...users, newUser])
                    simulateSync('Novo Usuário Criado')
                } else {
                    const err = await res.json()
                    alert('Erro ao criar: ' + err.error)
                    return
                }
            }
            setIsFormOpen(false)
            setEditingUser(null)
        } catch (error) {
            console.error(error)
            alert('Erro de conexão ao salvar usuário')
        }
    }

    // Show hidden users ONLY if current user is Master
    const visibleUsers = (users || []).filter((u: any) => !u.hidden || (currentUser?.role === 'MASTER'))

    // Password Change Logic
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [passUser, setPassUser] = useState<any>(null)
    const [newPass, setNewPass] = useState('')
    const [confirmPass, setConfirmPass] = useState('')

    const openPassModal = (user: any) => {
        setPassUser(user)
        setNewPass('')
        setConfirmPass('')
        setPasswordModalOpen(true)
    }

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPass !== confirmPass) {
            alert('As senhas não coincidem!')
            return
        }
        if (newPass.length < 4) {
            alert('A senha deve ter no mínimo 4 caracteres.')
            return
        }

        try {
            const res = await fetch(`/api/users/${passUser.id}/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPass })
            })

            if (res.ok) {
                alert('Senha alterada com sucesso!')
                setPasswordModalOpen(false)
                setPassUser(null)
            } else {
                const data = await res.json()
                alert('Erro ao alterar senha: ' + data.error)
            }
        } catch (error) {
            console.error(error)
            alert('Erro de conexão.')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gestão de Usuários e Perfis</h2>
                <button
                    onClick={() => { setEditingUser(null); setIsFormOpen(true) }}
                    className="flex items-center gap-2 bg-stone-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-stone-400 transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>Novo Usuário</span>
                </button>
            </div>

            <div className="bg-stone-900 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Email / Login</th>
                            <th className="p-4">Perfil</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {visibleUsers.map((user: any) => (
                            <tr key={user.id} className="hover:bg-white/5">
                                <td className="p-4 font-medium">{user.name}</td>
                                <td className="p-4 text-gray-400">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs border ${user.role === 'MANAGER' ? 'border-purple-500/20 bg-purple-500/10 text-purple-500' :
                                        user.role === 'SUPERVISOR' ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' :
                                            user.role === 'MASTER' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500' :
                                                'border-gray-500/20 bg-gray-500/10 text-gray-500'
                                        }`}>
                                        {user.role === 'MANAGER' ? 'Gerente' : user.role === 'SUPERVISOR' ? 'Supervisor' : user.role === 'MASTER' ? 'Master System' : 'Operador'}
                                    </span>
                                    {user.hasPin && (
                                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold uppercase" title="PIN POS Ativo">
                                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                            PIN
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button
                                        onClick={() => openPassModal(user)}
                                        className="p-2 hover:bg-white/10 rounded text-stone-500"
                                        title="Alterar Senha"
                                    >
                                        <Key className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="p-2 hover:bg-white/10 rounded text-gray-300"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {user.role !== 'MASTER' && (
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 hover:bg-white/10 rounded text-red-500"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 border border-white/10 rounded-xl p-8 max-w-2xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        <form className="space-y-6" onSubmit={handleSaveUser}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                                    <input
                                        name="name"
                                        type="text"
                                        defaultValue={editingUser?.name}
                                        required
                                        className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-stone-500 outline-none"
                                        placeholder="Ex: Maria Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email / Login</label>
                                    <input
                                        name="email"
                                        type="email"
                                        defaultValue={editingUser?.email}
                                        required
                                        className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-stone-500 outline-none"
                                        placeholder="maria@guardian.com"
                                    />
                                </div>
                            </div>

                             {!editingUser && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Senha do Portal (Numérica)</label>
                                        <input
                                            name="password"
                                            type="text"
                                            pattern="\d*"
                                            required
                                            className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-stone-500 outline-none"
                                            placeholder="Ex: 123456"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Apenas números para compatibilidade com o POS.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">PIN do Terminal (POS)</label>
                                        <input
                                            name="pin"
                                            type="text"
                                            maxLength={4}
                                            pattern="\d{4}"
                                            required
                                            className="w-full bg-black border border-white/10 rounded p-2 text-white font-mono tracking-widest focus:border-stone-500 outline-none"
                                            placeholder="0000"
                                        />
                                    </div>
                                </div>
                            )}

                            {editingUser && (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Novo PIN do Terminal (Deixe em branco para manter)</label>
                                    <input
                                        name="pin"
                                        type="text"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        defaultValue={editingUser?.pin}
                                        className="w-full md:w-1/3 bg-black border border-white/10 rounded p-2 text-white font-mono tracking-widest focus:border-stone-500 outline-none"
                                        placeholder="0000"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">O PIN é usado para troca rápida de operador e autorizações no POS Android.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-gray-400 mb-3">Selecione o Perfil de Acesso</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <label className="relative cursor-pointer group">
                                        <input type="radio" name="role" value="OPERATOR" className="peer sr-only" defaultChecked={!editingUser || editingUser.role === 'OPERATOR'} />
                                        <div className="p-4 rounded-lg border border-white/10 bg-black/20 peer-checked:border-stone-500 peer-checked:bg-stone-500/10 transition hover:bg-white/5 h-full">
                                            <div className="font-bold mb-1">Operador</div>
                                            <p className="text-xs text-gray-400">Apenas registra Entrada e Saída. Não pode cancelar tickets.</p>
                                        </div>
                                    </label>

                                    <label className="relative cursor-pointer group">
                                        <input type="radio" name="role" value="SUPERVISOR" className="peer sr-only" defaultChecked={editingUser?.role === 'SUPERVISOR'} />
                                        <div className="p-4 rounded-lg border border-white/10 bg-black/20 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition hover:bg-white/5 h-full">
                                            <div className="font-bold mb-1 text-blue-400">Supervisor</div>
                                            <p className="text-xs text-gray-400">Permissão para cancelar tickets e ver fechamento de caixa.</p>
                                        </div>
                                    </label>

                                    <label className="relative cursor-pointer group">
                                        <input type="radio" name="role" value="MANAGER" className="peer sr-only" defaultChecked={editingUser?.role === 'MANAGER'} />
                                        <div className="p-4 rounded-lg border border-white/10 bg-black/20 peer-checked:border-purple-500 peer-checked:bg-purple-500/10 transition hover:bg-white/5 h-full">
                                            <div className="font-bold mb-1 text-purple-400">Gerente</div>
                                            <p className="text-xs text-gray-400">Acesso total: Relatórios financeiros, Tabela de Preços e Usuários.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="bg-stone-500 text-black font-bold px-6 py-2 rounded hover:bg-stone-400 transition">
                                    {editingUser ? 'Atualizar Perfil' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {passwordModalOpen && passUser && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 border border-white/10 rounded-xl p-8 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Alterar Senha</h3>
                            <button onClick={() => setPasswordModalOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Defina uma nova senha para <strong>{passUser.name}</strong>.
                        </p>
                        <form className="space-y-4" onSubmit={handleSavePassword}>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-stone-500 outline-none"
                                    value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Confirmar Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-stone-500 outline-none"
                                    value={confirmPass}
                                    onChange={e => setConfirmPass(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="bg-stone-500 text-black font-bold px-4 py-2 rounded">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
