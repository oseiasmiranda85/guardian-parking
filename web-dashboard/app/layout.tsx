import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Guardian Parking Dashboard',
    description: 'Gestão de estacionamento em tempo real',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className + " bg-black text-white"}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    )
}
