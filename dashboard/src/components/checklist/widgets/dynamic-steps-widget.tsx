'use client'

import { useState, useActionState, useEffect } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WidgetConfig } from '../types'
import { saveDynamicCredentials } from './actions'

type DynamicStepsWidgetProps = {
    subAccountId: string
    config: WidgetConfig
    existingCredentials: Record<string, string>
}

export function DynamicStepsWidget({ subAccountId, config, existingCredentials }: DynamicStepsWidgetProps) {
    const [state, formAction, isPending] = useActionState(saveDynamicCredentials, { success: false, error: null })
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

    const toggleVisibility = (key: string) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Check if ALL required fields in this widget already have values saved
    // const allConfigured = config.fields.every(f => !!existingCredentials[f.key])

    useEffect(() => {
        if (state.success) {
            toast.success('Credentials saved successfully')
        } else if (state.error) {
            toast.error(state.error)
        }
    }, [state])

    return (
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
            {/* Widget Title Header */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3">
                <span className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                    {config.title}
                </span>
            </div>

            <div className="p-5">
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="subAccountId" value={subAccountId} />

                    {config.fields.map((field) => {
                        const isConfigured = !!existingCredentials[field.key]
                        const isVisible = showKeys[field.key]
                        const displayType = field.type === 'password' && !isVisible ? 'password' : 'text'

                        return (
                            <div
                                key={field.key}
                                className={`rounded-xl border p-4 transition-all duration-200 ${isConfigured
                                    ? 'border-green-500/30 bg-green-50/50 dark:bg-green-500/5'
                                    : 'border-border bg-background'
                                    }`}
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <Label htmlFor={field.key} className="text-[13px] font-medium text-foreground">
                                        {field.label}
                                    </Label>
                                    {isConfigured && (
                                        <div className="flex select-none items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-green-500/20">
                                            Configured
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <Input
                                        id={field.key}
                                        name={field.key}
                                        type={displayType}
                                        placeholder={isConfigured ? '••••••••••••••••••••••••••••' : field.placeholder}
                                        defaultValue={isConfigured ? existingCredentials[field.key] : ''}
                                        required={field.required}
                                        className={`pr-10 bg-background ${isConfigured ? 'font-mono text-muted-foreground bg-muted/30 focus-visible:ring-0 opacity-70 pointer-events-none' : ''
                                            }`}
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            onClick={() => toggleVisibility(field.key)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                        >
                                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    <Button
                        type="submit"
                        disabled={isPending}
                        className="mt-6 w-auto bg-[#1e293b] hover:bg-[#0f172a] text-white shadow-sm cursor-pointer"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save {config.title}
                    </Button>
                </form>
            </div>
        </div>
    )
}
