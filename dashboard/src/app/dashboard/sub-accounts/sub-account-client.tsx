'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { createSubAccount, deleteSubAccount } from './actions'
import { Plus, Trash2 } from 'lucide-react'

export function CreateSubAccountButton({ agencies }: { agencies: { id: string, name: string }[] }) {
    const [open, setOpen] = useState(false)
    const [state, formAction, isPending] = useActionState(createSubAccount, { success: false, error: null })

    const [, startTransition] = useTransition()
    useEffect(() => {
        if (state?.success) {
            toast.success('Sub-account created with default AI settings!')
            startTransition(() => {
                setOpen(false)
            })
        } else if (state?.error) {
            toast.error(state.error)
        }
    }, [state])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Sub-Account
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Create New Sub-Account</DialogTitle>
                        <DialogDescription>Add a new business to the platform. Default AI settings will be auto-initialized.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Business Name</Label>
                            <Input id="name" name="name" placeholder="e.g. ABC Roofing Co" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="agency_id">Parent Agency</Label>
                            <Select name="agency_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an agency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assigned_number">Assigned Phone Number (optional)</Label>
                            <Input id="assigned_number" name="assigned_number" placeholder="+1234567890" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Creating...' : 'Create Sub-Account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function SubAccountActions({ subAccountId, subAccountName }: { subAccountId: string, subAccountName: string }) {
    const [deleting, setDeleting] = useState(false)

    async function handleDelete() {
        if (!confirm(`Delete "${subAccountName}" and all its data? This cannot be undone.`)) return
        setDeleting(true)
        const result = await deleteSubAccount(subAccountId)
        setDeleting(false)
        if (result.success) {
            toast.success(`"${subAccountName}" deleted.`)
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
