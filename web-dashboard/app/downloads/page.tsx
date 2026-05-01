"use client"

import React from 'react'
import { Download, Smartphone, ShieldCheck, Zap, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export default function DownloadsPage() {
    const currentVersion = "2.1.3"
    const releaseDate = "01 de Maio, 2026 (01:40)"
    const apkUrl = "/downloads/guardian-v2.1.3.apk"

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>

            <div className="max-w-4xl w-full z-10 space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-bold tracking-widest uppercase mb-4">
                        <Smartphone className="w-4 h-4 text-red-500" />
                        Android Deployment Center
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
                        GUARDIAN <span className="text-red-600">POS</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Baixe a versão mais recente do nosso aplicativo para terminais Stone L4 e garanta máxima performance na sua operação.
                    </p>
                </div>

                {/* Main Download Card */}
                <div className="bg-stone-900/50 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-500">
                        <Smartphone className="w-64 h-64 rotate-12" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                        {/* Device Mockup / Icon */}
                        <div className="w-48 h-48 bg-gradient-to-br from-red-600 to-red-900 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(220,38,38,0.3)] animate-float">
                            <Smartphone className="w-24 h-24 text-white" />
                        </div>

                        {/* Info & Action */}
                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <div className="space-y-2">
                                <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                                    <h2 className="text-3xl font-bold italic uppercase tracking-tight">Versão {currentVersion}</h2>
                                    <span className="px-3 py-1 bg-green-500/20 text-green-500 text-[10px] font-black rounded-full border border-green-500/30 uppercase tracking-tighter">
                                        Stable Release
                                    </span>
                                </div>
                                <p className="text-gray-500 font-medium">Lançamento: {releaseDate}</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <ShieldCheck className="w-4 h-4 text-red-500" />
                                    <span>Seguro</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Zap className="w-4 h-4 text-yellow-500" />
                                    <span>Rápido</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <RefreshCcw className="w-4 h-4 text-blue-500" />
                                    <span>Multi-Login</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <a 
                                    href={apkUrl}
                                    download
                                    className="flex items-center justify-center gap-3 px-10 py-5 bg-white text-black font-black text-lg rounded-2xl hover:bg-gray-200 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                >
                                    <Download className="w-6 h-6" />
                                    BAIXAR AGORA
                                </a>
                                <Link 
                                    href="/dashboard"
                                    className="flex items-center justify-center px-10 py-5 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                                >
                                    Voltar ao Portal
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Release Notes */}
                <div className="max-w-2xl mx-auto space-y-6">
                    <h3 className="text-center text-sm font-black text-gray-500 uppercase tracking-widest">O que há de novo na v{currentVersion}</h3>
                    <ul className="space-y-4">
                        {[
                            "Relatório Financeiro: Inclusão de contador de cortesias e isenções no Portal e no Terminal",
                            "Auditoria de Caixa: Reconciliação automática de cortesias para evitar faturamento inflado",
                            "Impressão: Novo layout de fechamento de caixa (Z-Report) com resumo detalhado de isenções",
                            "Estabilidade: Otimização da API de Atividade para visualização consolidada no Dashboard",
                            "Estabilidade: Atualização do esquema do banco de dados local (v14) para melhor auditoria"
                        ].map((note, i) => (
                            <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                <span className="text-gray-300 font-medium">{note}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="text-center pt-12">
                    <p className="text-xs text-gray-600 uppercase tracking-tighter">
                        © 2026 Guardian Parking Systems • Todos os direitos reservados
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
