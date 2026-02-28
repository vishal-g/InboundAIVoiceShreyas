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
                formData.get('icon') as string
            )
            if (result.success) {
                toast.success('Checklist type created!')
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
                New Checklist
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Checklist Type</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="space-y-4 py-4">
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
                                <Input id="title" name="title" placeholder="e.g. Voice AI Rep Setup Progress" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" name="description" placeholder="e.g. Complete all phases to enable Voice AI reps" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon (emoji)</Label>
                                <Input id="icon" name="icon" placeholder="e.g. 🎙️" defaultValue="📋" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Creating...' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
