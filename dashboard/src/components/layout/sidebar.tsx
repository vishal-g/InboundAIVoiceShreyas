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
    LogOut,
    Zap,
    Building,
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

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

    function handleAgencyChange(value: string) {
        if (value === '__super_admin__') {
            setSelectedAgencyId('')
            setSelectedSubAccountId('')
            router.push('/dashboard')
        } else {
            setSelectedAgencyId(value)
            setSelectedSubAccountId('')
        }
    }

    function handleSubAccountChange(value: string) {
        if (value === '__agency_view__') {
            setSelectedSubAccountId('')
            router.push('/dashboard')
        } else {
            setSelectedSubAccountId(value)
            router.push(`/dashboard/${value}/settings`)
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
            <div className="border-b px-3 py-3 space-y-3">
                {/* Agency Dropdown — visible to platform_admin */}
                {isPlatformAdmin && agencies.length > 0 && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agency</label>
                        <Select value={selectedAgencyId || '__super_admin__'} onValueChange={handleAgencyChange}>
                            <SelectTrigger size="sm" className="w-full text-xs">
                                <SelectValue placeholder="Select agency…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__super_admin__">
                                    <span className="flex items-center gap-1.5">
                                        <Zap className="h-3 w-3 text-amber-500" />
                                        Super Admin View
                                    </span>
                                </SelectItem>
                                <SelectSeparator />
                                {agencies.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        <span className="flex items-center gap-1.5">
                                            <Building className="h-3 w-3 text-muted-foreground" />
                                            {a.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Sub-Account Dropdown — visible to platform_admin and agency_admin */}
                {(isPlatformAdmin || isAgencyAdmin) && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sub-Account</label>
                        <Select value={selectedSubAccountId || '__agency_view__'} onValueChange={handleSubAccountChange}>
                            <SelectTrigger size="sm" className="w-full text-xs">
                                <SelectValue placeholder="Select sub-account…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__agency_view__">
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3 text-blue-500" />
                                        Agency View
                                    </span>
                                </SelectItem>
                                <SelectSeparator />
                                {filteredSubAccounts.map((sa) => (
                                    <SelectItem key={sa.id} value={sa.id}>
                                        <span className="flex items-center gap-1.5">
                                            <Users2 className="h-3 w-3 text-muted-foreground" />
                                            {sa.name}
                                        </span>
                                    </SelectItem>
                                ))}
                                {filteredSubAccounts.length === 0 && (
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                                        No sub-accounts for this agency
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
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
