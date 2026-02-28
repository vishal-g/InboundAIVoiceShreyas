import { getAllChecklistTypes } from '@/components/checklist/actions'
import Link from 'next/link'
import { ClipboardList, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminChecklistActions from './admin-checklist-actions'

export default async function AdminChecklistsPage() {
    const checklistTypes = await getAllChecklistTypes()

    return (
        <div className="p-6 max-w-[1400px] mx-auto w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Checklists</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create and manage setup checklists for sub-accounts. Changes apply globally.
                    </p>
                </div>
                <AdminChecklistActions />
            </div>

            {checklistTypes.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ClipboardList className="w-12 h-12 text-muted-foreground/40 mb-4" />
                        <h3 className="font-semibold text-lg mb-1">No Checklists Yet</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                            Create your first checklist to define setup steps for sub-accounts.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {checklistTypes.map((ct) => (
                        <Link
                            key={ct.id}
                            href={`/dashboard/admin/checklists/${ct.id}`}
                            className="block"
                        >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                                <CardContent className="flex items-center justify-between py-5 px-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                                            {ct.icon || '📋'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{ct.title}</h3>
                                            <p className="text-sm text-muted-foreground">{ct.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                            {ct.id}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
