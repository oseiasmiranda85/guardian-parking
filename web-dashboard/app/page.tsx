"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: email, password })
            })

            const data = await res.json()

            if (res.ok) {
                localStorage.setItem('guardian_session', JSON.stringify(data))
                router.push('/portal')
            } else {
                setError(data.error || 'Erro ao entrar')
            }
        } catch (err) {
            setError('Falha na conexão')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-stone-500/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-stone-800/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-900 rounded-2xl border border-stone-500/30 mb-4 shadow-lg shadow-stone-900/50">
                        <span className="text-3xl font-bold text-stone-500">G</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Guardian Parking</h1>
                    <p className="text-gray-400">Entre para acessar o painel de gestão</p>
                </div>

                <form onSubmit={handleLogin} className="bg-stone-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5 ml-1">E-mail ou Usuário</label>
                            <div className="relative">
                                <User className="w-5 h-5 text-gray-500 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-stone-500 focus:ring-1 focus:ring-stone-500 outline-none transition"
                                    placeholder="admin@guardian.com ou user123"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5 ml-1">Senha</label>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-gray-500 absolute left-3 top-3" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-stone-500 focus:ring-1 focus:ring-stone-500 outline-none transition"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-8 bg-stone-500 text-black font-bold py-3.5 rounded-lg hover:bg-stone-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-stone-500/20"
                    >
                        Entrar no Sistema
                    </button>

                    <div className="mt-6 text-center">
                        {/* <a href="#" className="text-xs text-gray-500 hover:text-stone-400 transition">Esqueceu sua senha?</a> */}
                    </div>
                </form>

                <p className="mt-8 text-center text-xs text-gray-600">
                    &copy; 2026 Guardian Parking Systems. V 2.1.0
                </p>
            </div>
        </div>
    )
}
