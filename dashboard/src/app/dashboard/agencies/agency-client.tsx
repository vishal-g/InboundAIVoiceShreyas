'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { createAgency, deleteAgency } from './actions'
import { Plus, Trash2 } from 'lucide-react'

export function CreateAgencyButton() {
    const [open, setOpen] = useState(false)
    const [state, formAction, isPending] = useActionState(createAgency, { success: false, error: null })

    useEffect(() => {
        if (state?.success) {
            toast.success('Agency created!')
            setOpen(false)
        } else if (state?.error) {
            toast.error(state.error)
        }
    }, [state])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Agency
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Agency</DialogTitle>
                        <DialogDescription>Add a new white-label agency to the platform.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Agency Name</Label>
                            <Input id="name" name="name" placeholder="e.g. Acme Digital Agency" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Creating...' : 'Create Agency'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function AgencyActions({ agencyId, agencyName }: { agencyId: string, agencyName: string }) {
    const [deleting, setDeleting] = useState(false)

    async function handleDelete() {
        if (!confirm(`Delete "${agencyName}" and all its sub-accounts? This cannot be undone.`)) return
        setDeleting(true)
        const result = await deleteAgency(agencyId)
        setDeleting(false)
        if (result.success) {
            toast.success(`Agency "${agencyName}" deleted.`)
        } else {
            toast.error(result.error || 'Failed to delete')
        }
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
