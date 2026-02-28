'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
    Home,
    Building2,
    Settings,
    Users2,
    PhoneCall,
    ChevronDown,
    LogOut,
} from 'lucide-react'

type Agency = { id: string; name: string }
type SubAccount = { id: string; name: string; agency_id: string }

interface SidebarProps {
    userRole: string
    subAccountId: string | null
    agencyId: string | null
    agencies: Agency[]
    subAccounts: SubAccount[]
    userEmail?: string
}

export default function Sidebar({
    userRole,
    subAccountId,
    agencyId,
    agencies,
    subAccounts,
    userEmail,
}: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const isPlatformAdmin = userRole === 'platform_admin'
    const isAgencyAdmin = userRole === 'agency_admin'

    const [selectedAgencyId, setSelectedAgencyId] = useState(agencyId || agencies[0]?.id || '')
    const [selectedSubAccountId, setSelectedSubAccountId] = useState(subAccountId || '')

    // Filter sub-accounts by selected agency
    const filteredSubAccounts = isPlatformAdmin
        ? subAccounts.filter((sa) => sa.agency_id === selectedAgencyId)
        : subAccounts

    // Build nav links
    const activeSubId = selectedSubAccountId || filteredSubAccounts[0]?.id || 'demo'

    const navLinks = [
        { href: '/dashboard', icon: Home, label: 'Overview' },
        ...(isPlatformAdmin || isAgencyAdmin
            ? [
                { href: '/dashboard/agencies', icon: Building2, label: 'Agencies' },
                { href: '/dashboard/sub-accounts', icon: Users2, label: 'Sub-Accounts' },
            ]
            : []),
        { href: `/dashboard/${activeSubId}/settings`, icon: Settings, label: 'AI Settings' },
        { href: `/dashboard/${activeSubId}/logs`, icon: PhoneCall, label: 'Call Logs' },
    ]

    function handleAgencyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setSelectedAgencyId(e.target.value)
        setSelectedSubAccountId('')
    }

    function handleSubAccountChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setSelectedSubAccountId(e.target.value)
        // Navigate to the selected sub-account's settings
        if (e.target.value) {
            router.push(`/dashboard/${e.target.value}/settings`)
        }
    }

    async function handleSignOut() {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r bg-background sm:flex">
            {/* Brand */}
            <div className="flex h-14 items-center border-b px-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        RX
                    </span>
                    <span className="font-semibold text-sm">RapidX AI</span>
                </Link>
            </div>

            {/* Context Switchers */}
            <div className="border-b px-3 py-3 space-y-2">
                {/* Agency Dropdown — visible to platform_admin */}
                {isPlatformAdmin && agencies.length > 0 && (
                    <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agency</label>
                        <select
                            value={selectedAgencyId}
                            onChange={handleAgencyChange}
                            className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {agencies.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Sub-Account Dropdown — visible to platform_admin and agency_admin */}
                {(isPlatformAdmin || isAgencyAdmin) && (
                    <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sub-Account</label>
                        <select
                            value={selectedSubAccountId}
                            onChange={handleSubAccountChange}
                            className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="">Select…</option>
                            {filteredSubAccounts.map((sa) => (
                                <option key={sa.id} value={sa.id}>{sa.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-1">
                    {navLinks.map((link) => {
                        const isActive =
                            pathname === link.href ||
                            (link.href !== '/dashboard' && pathname.startsWith(link.href))
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                                    }`}
                            >
                                <link.icon className="h-4 w-4 shrink-0" />
                                {link.label}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* User / Sign Out */}
            <div className="border-t px-3 py-3">
                <div className="text-xs text-muted-foreground truncate mb-1">{userEmail}</div>
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}
