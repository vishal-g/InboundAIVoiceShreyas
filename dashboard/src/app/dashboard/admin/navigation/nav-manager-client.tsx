'use client'

import dynamic from 'next/dynamic'
import { NavigationItem } from './actions'

const NavManager = dynamic(() => import('./nav-manager'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    )
})

export default function NavManagerClient({ initialItems }: { initialItems: NavigationItem[] }) {
    return <NavManager initialItems={initialItems} />
}
