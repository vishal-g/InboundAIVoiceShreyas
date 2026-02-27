'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Building2,
    Settings,
    Users2,
    PhoneCall
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

export default function Sidebar({ userRole, subAccountId }: { userRole: string, subAccountId: string | null }) {
    const pathname = usePathname()

    // Define navigation based on role
    const adminLinks = [
        { href: '/dashboard', icon: Home, label: 'Overview' },
        { href: '/dashboard/agencies', icon: Building2, label: 'Agencies' },
        { href: '/dashboard/sub-accounts', icon: Users2, label: 'Sub-Accounts' },
    ]

    const subAccountLinks = [
        { href: '/dashboard', icon: Home, label: 'Overview' },
        { href: `/dashboard/${subAccountId || 'demo'}/settings`, icon: Settings, label: 'AI Settings' },
        { href: `/dashboard/${subAccountId || 'demo'}/logs`, icon: PhoneCall, label: 'Call Logs' },
    ]

    const links = userRole === 'platform_admin' ? adminLinks : subAccountLinks

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
            <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                <Link
                    href="/dashboard"
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                >
                    <span className="text-xs font-bold">RX</span>
                    <span className="sr-only">RapidX AI</span>
                </Link>
                <TooltipProvider>
                    {links.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
                        return (
                            <Tooltip key={link.href}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={link.href}
                                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${isActive
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <link.icon className="h-5 w-5" />
                                        <span className="sr-only">{link.label}</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{link.label}</TooltipContent>
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </nav>
        </aside>
    )
}
