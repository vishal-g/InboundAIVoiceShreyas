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
    Check,
    ChevronsUpDown,
    MessageSquareText,
    ClipboardList,
} from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    const [agencyOpen, setAgencyOpen] = useState(false)
    const [subAccountOpen, setSubAccountOpen] = useState(false)

    // Filter sub-accounts by selected agency
    const filteredSubAccounts = isPlatformAdmin
        ? subAccounts.filter((sa) => sa.agency_id === selectedAgencyId)
        : subAccounts

    // Build nav links
    const activeSubId = selectedSubAccountId || filteredSubAccounts[0]?.id || 'demo'

    // View mode flags
    const isSubAccountView = !!selectedSubAccountId
    const isAgencyView = !!selectedAgencyId && !isSubAccountView
    const isSuperAdminView = !selectedAgencyId && !isSubAccountView

    // URL params for navigation
    const contextParam = isSubAccountView
        ? `?sub_account_id=${selectedSubAccountId}`
        : selectedAgencyId ? `?agency_id=${selectedAgencyId}` : ''
    const agencyParam = selectedAgencyId ? `?agency_id=${selectedAgencyId}` : ''

    const navLinks = [
        { href: `/dashboard${contextParam}`, icon: Home, label: 'Overview' },
        // Super Admin: show Agencies + Sub-Accounts + Manage Checklists
        ...(isSuperAdminView && isPlatformAdmin
            ? [
                { href: '/dashboard/agencies', icon: Building2, label: 'Agencies' },
                { href: '/dashboard/sub-accounts', icon: Users2, label: 'Sub-Accounts' },
                { href: '/dashboard/admin/checklists', icon: ClipboardList, label: 'Manage Checklists' },
            ]
            : []),
        // Agency View: show Sub-Accounts for this agency
        ...(isAgencyView && (isPlatformAdmin || isAgencyAdmin)
            ? [
                { href: `/dashboard/sub-accounts${agencyParam}`, icon: Users2, label: 'Sub-Accounts' },
            ]
            : []),
        // Sub-Account View: show Text AI Rep + AI Settings + Call Logs
        ...(isSubAccountView
            ? [
                { href: `/dashboard/${activeSubId}/text-ai/config`, icon: MessageSquareText, label: 'Text AI Rep' },
                { href: `/dashboard/${activeSubId}/settings`, icon: Settings, label: 'AI Settings' },
                { href: `/dashboard/${activeSubId}/logs`, icon: PhoneCall, label: 'Call Logs' },
            ]
            : []),
    ]

    const selectedAgencyName = agencies.find((a) => a.id === selectedAgencyId)?.name
    const selectedSubAccountName = filteredSubAccounts.find((sa) => sa.id === selectedSubAccountId)?.name

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
                        ST
                    </span>
                    <span className="font-semibold text-sm">Spinning Top AI</span>
                </Link>
            </div>

            {/* Context Switchers */}
            <div className="border-b px-3 py-3 space-y-3">
                {/* Agency Combobox — visible to platform_admin */}
                {isPlatformAdmin && agencies.length > 0 && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agency</label>
                        <Popover open={agencyOpen} onOpenChange={setAgencyOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={agencyOpen}
                                    className="w-full justify-between text-xs h-8 px-2 font-normal"
                                >
                                    <span className="truncate">
                                        {selectedAgencyId ? (selectedAgencyName || 'Select…') : '⚡ Super Admin View'}
                                    </span>
                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="start" sideOffset={4}>
                                <Command>
                                    <CommandInput placeholder="Search agency…" className="h-8 text-xs" />
                                    <CommandList>
                                        <CommandEmpty>No agency found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="super-admin-view"
                                                onSelect={() => {
                                                    setSelectedAgencyId('')
                                                    setSelectedSubAccountId('')
                                                    setAgencyOpen(false)
                                                    router.push('/dashboard')
                                                }}
                                            >
                                                <Zap className={cn("mr-2 h-3 w-3 text-amber-500")} />
                                                <span className="text-xs">Super Admin View</span>
                                                <Check className={cn("ml-auto h-3 w-3", !selectedAgencyId ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup heading="Agencies">
                                            {agencies.map((a) => (
                                                <CommandItem
                                                    key={a.id}
                                                    value={a.name}
                                                    onSelect={() => {
                                                        setSelectedAgencyId(a.id)
                                                        setSelectedSubAccountId('')
                                                        setAgencyOpen(false)
                                                        router.push(`/dashboard?agency_id=${a.id}`)
                                                    }}
                                                >
                                                    <Building className={cn("mr-2 h-3 w-3 text-muted-foreground")} />
                                                    <span className="text-xs">{a.name}</span>
                                                    <Check className={cn("ml-auto h-3 w-3", selectedAgencyId === a.id ? "opacity-100" : "opacity-0")} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {/* Sub-Account Combobox — visible to platform_admin and agency_admin */}
                {(isPlatformAdmin || isAgencyAdmin) && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sub-Account</label>
                        <Popover open={subAccountOpen} onOpenChange={setSubAccountOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={subAccountOpen}
                                    className="w-full justify-between text-xs h-8 px-2 font-normal"
                                >
                                    <span className="truncate">
                                        {selectedSubAccountId ? (selectedSubAccountName || 'Select…') : '🏢 Agency View'}
                                    </span>
                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="start" sideOffset={4}>
                                <Command>
                                    <CommandInput placeholder="Search sub-account…" className="h-8 text-xs" />
                                    <CommandList>
                                        <CommandEmpty>No sub-account found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="agency-view"
                                                onSelect={() => {
                                                    setSelectedSubAccountId('')
                                                    setSubAccountOpen(false)
                                                    router.push('/dashboard')
                                                }}
                                            >
                                                <Building2 className={cn("mr-2 h-3 w-3 text-blue-500")} />
                                                <span className="text-xs">Agency View</span>
                                                <Check className={cn("ml-auto h-3 w-3", !selectedSubAccountId ? "opacity-100" : "opacity-0")} />
                                            </CommandItem>
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup heading="Sub-Accounts">
                                            {filteredSubAccounts.map((sa) => (
                                                <CommandItem
                                                    key={sa.id}
                                                    value={sa.name}
                                                    onSelect={() => {
                                                        setSelectedSubAccountId(sa.id)
                                                        setSubAccountOpen(false)
                                                        router.push(`/dashboard?sub_account_id=${sa.id}`)
                                                    }}
                                                >
                                                    <Users2 className={cn("mr-2 h-3 w-3 text-muted-foreground")} />
                                                    <span className="text-xs">{sa.name}</span>
                                                    <Check className={cn("ml-auto h-3 w-3", selectedSubAccountId === sa.id ? "opacity-100" : "opacity-0")} />
                                                </CommandItem>
                                            ))}
                                            {filteredSubAccounts.length === 0 && (
                                                <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                                                    No sub-accounts
                                                </div>
                                            )}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
