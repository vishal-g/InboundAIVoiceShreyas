'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createChecklistType } from '@/components/checklist/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function AdminChecklistActions() {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await createChecklistType(
                formData.get('id') as string,
                formData.get('title') as string,
                formData.get('description') as string,
                formData.get('icon') as string,
                formData.get('display_type') as 'checklist' | 'page'
            )
            if (result.success) {
                toast.success('Page created successfully!')
                setIsOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to create')
            }
        })
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Page
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Page</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="display_type">Display Type</Label>
                                <select
                                    id="display_type"
                                    name="display_type"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    defaultValue="checklist"
                                >
                                    <option value="checklist">Checklist (Progress tracking, Done buttons)</option>
                                    <option value="page">Page (Static content, no progress)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="id">ID (slug)</Label>
                                <Input
                                    id="id"
                                    name="id"
                                    placeholder="e.g. voice_ai_config"
                                    required
                                    pattern="[a-z0-9_]+"
                                    title="Lowercase letters, numbers, and underscores only"
                                />
                                <p className="text-xs text-muted-foreground">Used in URLs and code. Cannot be changed later.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" name="title" placeholder="e.g. Platform Credentials" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" name="description" placeholder="e.g. Manage your API keys and AI behaviors" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon (emoji)</Label>
                                <Input id="icon" name="icon" placeholder="e.g. 🔑" defaultValue="📄" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Creating...' : 'Create Page'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
