import { getNavigationItems } from './actions'
import NavManagerClient from './nav-manager-client'
import { Layout } from 'lucide-react'

export default async function NavigationPage() {
    const items = await getNavigationItems()

    return (
        <div className="p-6 max-w-[1400px] mx-auto w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Layout className="w-6 h-6" />
                        Manage Sidebar Menu
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add, edit, or reorder dynamic navigation items. Changes apply in real-time.
                    </p>
                </div>
            </div>

            {/* @ts-ignore - dynamic import type mismatch */}
            <NavManagerClient initialItems={items} />
        </div>
    )
}
