"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Save, ArrowLeft, Key, User, Mail } from 'lucide-react'

export default function ProfilePage({ params }: { params: { id: string } }) {
    const router = useRouter()
    
    const [profile, setProfile] = useState({ name: '', email: '' })
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        fetch(`/api/admin/admins/${params.id}`)
            .then(res => res.json())
            .then(data => {
                if(data.error) throw new Error(data.error)
                setProfile({ name: data.name || '', email: data.email || '' })
                setLoading(false)
            })
            .catch(err => {
                setErrorMsg('Erro ao carregar dados do usuário logado.')
                setLoading(false)
            })
    }, [params.id])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')
        
        if (password && password !== confirmPassword) {
            setErrorMsg('As senhas não coincidem.')
            return
        }

        setSaving(true)
        try {
            const payload: any = { name: profile.name, email: profile.email }
            if (password) payload.password = password

            const res = await fetch(`/api/admin/admins/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Falha ao atualizar dados.')

            const updatedData = await res.json()
            
            // Atualiza a sessão (se o nome mudar)
            const sessionStr = localStorage.getItem('guardian_session')
            if (sessionStr) {
                const session = JSON.parse(sessionStr)
                session.name = updatedData.name
                localStorage.setItem('guardian_session', JSON.stringify(session))
            }
            
            alert('Perfil atualizado com sucesso!')
            setPassword('')
            setConfirmPassword('')
            // Força recarregamento do layout para atualizar iniciais
            window.location.reload()

        } catch (error: any) {
            setErrorMsg(error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-white">Carregando perfil...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-white mb-2 text-sm transition">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>

            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="w-16 h-16 rounded-full bg-red-900/50 border border-red-500/50 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Meu Perfil</h1>
                    <p className="text-gray-400">Gerencie suas credenciais de acesso como Administrador Master.</p>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl font-bold">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSave} className="bg-stone-900 border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
                
                <h3 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-white">Dados Pessoais</h3>
                
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="text-sm text-gray-400 flex items-center gap-2 mb-2"><User className="w-4 h-4" /> Nome Completo</label>
                        <input 
                            type="text" 
                            required
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-red-500 transition outline-none"
                            value={profile.name}
                            onChange={(e) => setProfile(prev => ({...prev, name: e.target.value}))}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 flex items-center gap-2 mb-2"><Mail className="w-4 h-4" /> E-mail (Login)</label>
                        <input 
                            type="email" 
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-gray-500 cursor-not-allowed outline-none"
                            value={profile.email}
                            disabled
                        />
                        <p className="text-xs text-gray-600 mt-1">* O e-mail de acesso não pode ser alterado por segurança.</p>
                    </div>
                </div>

                <h3 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-white">Segurança</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 flex items-center gap-2 mb-2"><Key className="w-4 h-4" /> Nova Senha</label>
                        <input 
                            type="password" 
                            placeholder="Deixe em branco para não alterar"
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-red-500 transition outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 flex items-center gap-2 mb-2"><Key className="w-4 h-4" /> Confirmar Nova Senha</label>
                        <input 
                            type="password" 
                            className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-red-500 transition outline-none"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" /> 
                        {saving ? 'Atualizando...' : 'Atualizar Perfil'}
                    </button>
                </div>

            </form>
        </div>
    )
}
