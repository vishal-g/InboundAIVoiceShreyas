'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Globe, Trash2, Plus, Loader2, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils/date'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface URLsTabProps {
    subAccountId: string
}

export default function URLsTab({ subAccountId }: URLsTabProps) {
    const [urls, setUrls] = useState<any[]>([])
    const [newUrl, setNewUrl] = useState('')
    const [adding, setAdding] = useState(false)
    const [loading, setLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const fetchUrls = useCallback(async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('kb_urls')
                .select('*')
                .eq('sub_account_id', subAccountId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setUrls(data || [])
        } catch (error: any) {
            console.error('Error fetching URLs:', error)
            toast.error(`Failed to load URLs: ${error.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }, [subAccountId])

    useEffect(() => {
        fetchUrls()
    }, [fetchUrls])

    async function processUrl(urlId: string, urlStr: string) {
        try {
            const response = await fetch('/api/kb/process-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url_id: urlId, sub_account_id: subAccountId })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to process URL')

            toast.success(`Search finished for ${urlStr}`)
            fetchUrls()
        } catch (error: any) {
            console.error('URL processing error:', error)
            toast.error(`Error processing ${urlStr}: ${error.message}`)
            fetchUrls()
        }
    }

    async function handleAddUrl(e: React.FormEvent) {
        e.preventDefault()
        if (!newUrl) return

        try {
            // Basic URL validation
            new URL(newUrl)
        } catch (e) {
            toast.error('Please enter a valid URL (including https://)')
            return
        }

        setAdding(true)
        const supabase = createClient()

        try {
            const { data, error } = await supabase
                .from('kb_urls')
                .insert({
                    sub_account_id: subAccountId,
                    url: newUrl,
                    status: 'pending'
                })
                .select()
                .single()

            if (error) throw error

            toast.info('URL added, starting crawl...')
            setNewUrl('')
            fetchUrls()

            // Trigger background processing
            processUrl(data.id, data.url)
        } catch (error: any) {
            console.error('URL add error:', error)
            toast.error(`Failed to add URL: ${error.message}`)
        } finally {
            setAdding(false)
        }
    }

    async function handleDelete() {
        if (!deleteId) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('kb_urls')
                .delete()
                .eq('id', deleteId)

            if (error) throw error

            toast.success('URL removed')
            setUrls(urls.filter(u => u.id !== deleteId))
        } catch (error: any) {
            console.error('Delete error:', error)
            toast.error('Failed to remove URL')
        } finally {
            setDeleteId(null)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'crawling': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
            default: return <Clock className="h-4 w-4 text-muted-foreground" />
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add URLs</CardTitle>
                    <CardDescription>
                        Enter public URLs you want the AI to crawl and learn from.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddUrl} className="flex items-center gap-4">
                        <Input
                            type="url"
                            placeholder="https://example.com/about"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            disabled={adding}
                            className="flex-1"
                            required
                        />
                        <Button type="submit" disabled={adding}>
                            {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add URL
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Crawled URLs</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : urls.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <Globe className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                            <h3 className="mt-4 text-lg font-medium">No URLs yet</h3>
                            <p className="text-muted-foreground">Add a URL to start building your knowledge base.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>URL</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Crawled</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {urls.map((url) => (
                                    <TableRow key={url.id}>
                                        <TableCell className="font-medium max-w-[300px] truncate">
                                            <a
                                                href={url.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 hover:underline"
                                            >
                                                <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                                                {url.url}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 capitalize">
                                                {getStatusIcon(url.status)}
                                                {url.status}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {url.last_crawled_at
                                                ? formatDistanceToNow(new Date(url.last_crawled_at))
                                                : 'Never'
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {url.status === 'error' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => processUrl(url.id, url.url)}
                                                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                                        title="Retry processing"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(url.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently remove the URL and
                            all its associated vector embeddings.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
