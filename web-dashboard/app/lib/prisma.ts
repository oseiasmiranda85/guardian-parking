
import { PrismaClient } from '@prisma/client'
// Force reload: 2026-04-24T17:30:00

// Mudamos a chave global para ignorar instâncias antigas presas no processo
const globalForPrisma = global as unknown as { prisma_hard_reload_v4: PrismaClient }

export const prisma = (() => {
  // Se estivermos em produção, retornamos uma nova instância ou a global
  if (process.env.NODE_ENV === 'production') return new PrismaClient()

  // Em dev, forçamos a criação se a chave global v4 estiver vazia
  if (!globalForPrisma.prisma_hard_reload_v4) {
    console.log("🚀 Criando nova instância do PrismaClient (v4 Hard Reload)...")
    globalForPrisma.prisma_hard_reload_v4 = new PrismaClient()
  }

  return globalForPrisma.prisma_hard_reload_v4
})()
