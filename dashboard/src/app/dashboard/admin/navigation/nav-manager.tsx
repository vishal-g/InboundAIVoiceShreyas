'use client'

import React, { useState, useTransition } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
    GripVertical,
    Pencil,
    Trash2,
    Plus,
    Save,
    X,
    Home,
    Building2,
    Settings,
    Users2,
    PhoneCall,
    Zap,
    Building,
    ClipboardList,
    MessageSquareText,
    Layout
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { NavigationItem, upsertNavigationItem, deleteNavigationItem, updateNavigationOrder } from './actions'

const ICON_OPTIONS = {
    Home,
    Building2,
    Settings,
    Users2,
    PhoneCall,
    Zap,
    Building,
    ClipboardList,
    MessageSquareText,
    Layout
}

interface NavManagerProps {
    initialItems: NavigationItem[]
}

export default function NavManager({ initialItems }: NavManagerProps) {
    const [items, setItems] = useState(initialItems)
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [currentItem, setCurrentItem] = useState<Partial<NavigationItem> | null>(null)

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return

        const newItems = Array.from(items)
        const [reorderedItem] = newItems.splice(result.source.index, 1)
        newItems.splice(result.destination.index, 0, reorderedItem)

        setItems(newItems)

        startTransition(async () => {
            const res = await updateNavigationOrder(newItems.map(i => i.id))
            if (!res.success) {
                toast.error('Failed to save new order')
                setItems(items) // rollback
            } else {
                toast.success('Order updated')
            }
        })
    }

    const handleSave = async () => {
        if (!currentItem?.label || !currentItem?.href) {
            toast.error('Label and Href are required')
            return
        }

        startTransition(async () => {
            const res = await upsertNavigationItem(currentItem)
            if (res.success) {
                toast.success(currentItem.id ? 'Item updated' : 'Item created')
                setIsEditing(false)
                // Refresh local state (simplified)
                const updatedItems = currentItem.id
                    ? items.map(i => i.id === currentItem.id ? { ...i, ...currentItem } as NavigationItem : i)
                    : [...items, { ...currentItem, id: res.data.id, sort_order: items.length } as NavigationItem]
                setItems(updatedItems)
            } else {
                toast.error(res.error || 'Failed to save')
            }
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this menu item?')) return

        startTransition(async () => {
            const res = await deleteNavigationItem(id)
            if (res.success) {
                toast.success('Item deleted')
                setItems(items.filter(i => i.id !== id))
            } else {
                toast.error(res.error || 'Failed to delete')
            }
        })
    }

    const openEdit = (item: NavigationItem | null = null) => {
        setCurrentItem(item || {
            label: '',
            href: '',
            icon: 'Home',
            view_mode: 'all',
            required_role: 'all',
            is_active: true
        })
        setIsEditing(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => openEdit()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Menu Item
                </Button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="nav-items">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                        >
                            {items.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(provided) => (
                                        <Card
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="group hover:border-primary/50 transition-colors"
                                        >
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div {...provided.dragHandleProps} className="text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing">
                                                        <GripVertical className="w-5 h-5" />
                                                    </div>
                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                        {React.createElement((ICON_OPTIONS as any)[item.icon || 'Home'] || Home, { className: 'w-5 h-5' })}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-sm flex items-center gap-2">
                                                            {item.label}
                                                            {!item.is_active && (
                                                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded leading-none">Inactive</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono">{item.href}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="hidden md:flex flex-col items-end text-[10px] text-muted-foreground uppercase tracking-wider gap-0.5">
                                                        <span>View: {item.view_mode}</span>
                                                        <span>Role: {item.required_role}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentItem?.id ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Label</Label>
                                <Input
                                    value={currentItem?.label || ''}
                                    onChange={e => setCurrentItem(prev => ({ ...prev!, label: e.target.value }))}
                                    placeholder="e.g. Overview"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Link (Href)</Label>
                                <Input
                                    value={currentItem?.href || ''}
                                    onChange={e => setCurrentItem(prev => ({ ...prev!, href: e.target.value }))}
                                    placeholder="/dashboard/..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <Select
                                    value={currentItem?.icon}
                                    onValueChange={v => setCurrentItem(prev => ({ ...prev!, icon: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select icon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(ICON_OPTIONS).map(name => (
                                            <SelectItem key={name} value={name}>
                                                <div className="flex items-center gap-2">
                                                    {React.createElement((ICON_OPTIONS as any)[name], { className: 'w-4 h-4' })}
                                                    {name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={currentItem?.is_active}
                                        onChange={(e) => setCurrentItem(prev => ({ ...prev!, is_active: e.target.checked }))}
                                    />
                                    <span className="text-sm">Is Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>View Mode</Label>
                                <Select
                                    value={currentItem?.view_mode}
                                    onValueChange={(v: any) => setCurrentItem(prev => ({ ...prev!, view_mode: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Views</SelectItem>
                                        <SelectItem value="super_admin">Super Admin Only</SelectItem>
                                        <SelectItem value="agency">Agency Only</SelectItem>
                                        <SelectItem value="sub_account">Sub-Account Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Required Role</Label>
                                <Select
                                    value={currentItem?.required_role}
                                    onValueChange={(v: any) => setCurrentItem(prev => ({ ...prev!, required_role: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Everyone</SelectItem>
                                        <SelectItem value="platform_admin">Platform Admin Only</SelectItem>
                                        <SelectItem value="agency_admin">Agency Admin & Above</SelectItem>
                                        <SelectItem value="sub_account_user">Sub-Account User & Above</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground italic bg-muted p-2 rounded">
                            Tip: For sub-account links, use <code className="bg-primary/10 px-1">{"{subAccountId}"}</code> in the href.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isPending}>
                            {isPending ? 'Saving...' : 'Save Item'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
