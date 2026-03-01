'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Upload, Trash2, FileIcon, Loader2, CheckCircle2, Clock, AlertCircle, RefreshCw, X } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
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

interface DocumentsTabProps {
    subAccountId: string
}

export default function DocumentsTab({ subAccountId }: DocumentsTabProps) {
    const [files, setFiles] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [loading, setLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deletePath, setDeletePath] = useState<string | null>(null)
    const [showUpload, setShowUpload] = useState(false)

    const fetchFiles = useCallback(async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('kb_documents')
                .select('*')
                .eq('sub_account_id', subAccountId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setFiles(data || [])
        } catch (error: any) {
            console.error('Error fetching files:', error)
            toast.error(`Failed to load documents: ${error.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }, [subAccountId])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    const handleFiles = useCallback(async (selectedFiles: FileList | File[]) => {
        const validFiles = Array.from(selectedFiles).filter(f => f.type === 'application/pdf')

        if (validFiles.length === 0) {
            toast.error('Please select valid PDF files')
            return
        }

        if (validFiles.length !== selectedFiles.length) {
            toast.warning(`Skipped ${selectedFiles.length - validFiles.length} non-PDF files`)
        }

        setUploading(true)
        setUploadProgress({ current: 0, total: validFiles.length })

        const supabase = createClient()

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            setUploadProgress(prev => ({ ...prev, current: i + 1 }))

            try {
                // 1. Upload to Storage
                const filePath = `${subAccountId}/${Date.now()}_${file.name}`
                const { error: storageError } = await supabase.storage
                    .from('knowledgebase')
                    .upload(filePath, file)

                if (storageError) throw storageError

                // 2. Create Database Record
                const { data: newDoc, error: dbError } = await supabase
                    .from('kb_documents')
                    .insert({
                        sub_account_id: subAccountId,
                        file_name: file.name,
                        file_path: filePath,
                        file_size: file.size,
                        status: 'processing'
                    })
                    .select()
                    .single()

                if (dbError) throw dbError

                // 3. Trigger Processing
                processFile(newDoc.id, file.name)
                // We refresh local list to show the new 'processing' record
                fetchFiles()
            } catch (error: any) {
                console.error(`Error uploading ${file.name}:`, error)
                toast.error(`Failed to upload ${file.name}: ${error.message}`)
            }
        }

        setUploading(false)
        setUploadProgress({ current: 0, total: 0 })
    }, [subAccountId, fetchFiles])

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            handleFiles(e.target.files)
            e.target.value = '' // Reset
        }
    }

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files)
        }
    }, [handleFiles])

    async function processFile(documentId: string, fileName?: string) {
        try {
            // Optimistically update UI status if visible
            setFiles(prev => prev.map(f => f.id === documentId ? { ...f, status: 'processing' } : f))

            const response = await fetch('/api/kb/process-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: documentId,
                    sub_account_id: subAccountId
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Processing failed')

            toast.success(`Processing complete${fileName ? ': ' + fileName : ''}`)
            fetchFiles()
        } catch (error: any) {
            console.error('Processing error:', error)
            toast.error(`Processing failed: ${error.message}`)
            fetchFiles()
        }
    }

    async function handleDelete() {
        if (!deleteId || !deletePath) return

        try {
            const supabase = createClient()

            // 1. Delete from Storage
            await supabase.storage.from('knowledgebase').remove([deletePath])

            // 2. Delete from DB (kb_chunks will be deleted via CASCADE)
            const { error } = await supabase
                .from('kb_documents')
                .delete()
                .eq('id', deleteId)

            if (error) throw error

            toast.success('Document deleted')
            setFiles(prev => prev.filter(f => f.id !== deleteId))
        } catch (error: any) {
            console.error('Delete error:', error)
            toast.error('Failed to delete document')
        } finally {
            setDeleteId(null)
            setDeletePath(null)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
            default: return <Clock className="h-4 w-4 text-muted-foreground" />
        }
    }

    return (
        <div className="space-y-6">
            {showUpload && (
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle>Upload Documents</CardTitle>
                            <CardDescription>
                                Upload PDF documents to your knowledge base.
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowUpload(false)}
                            className="h-8 w-8 rounded-full hover:bg-background"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            className={`
                                relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-all duration-200
                                ${isDragging ? 'border-primary bg-background scale-[1.01]' : 'border-muted-foreground/20 bg-background hover:border-primary/50'}
                                ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            `}
                            onClick={() => !uploading && document.getElementById('file-upload')?.click()}
                        >
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="p-4 rounded-full bg-primary/10 text-primary">
                                    {uploading ? (
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    ) : (
                                        <Upload className="h-8 w-8" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold">
                                        {uploading
                                            ? `Uploading File ${uploadProgress.current} of ${uploadProgress.total}`
                                            : 'Drop PDFs here'
                                        }
                                    </h3>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        {uploading
                                            ? 'Please wait while we process your documents...'
                                            : 'Drag and drop files, or click to browse'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div className="space-y-1">
                        <CardTitle>Your Documents</CardTitle>
                        <CardDescription>Manage and process files in your knowledge base</CardDescription>
                    </div>
                    {!showUpload && (
                        <Button
                            onClick={() => setShowUpload(true)}
                            className="gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            Upload PDF
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <FileIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                            <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
                            <p className="text-muted-foreground">Upload your first PDF to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {files.map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileIcon className="h-4 w-4 text-blue-500" />
                                                {file.file_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 capitalize">
                                                    {getStatusIcon(file.status)}
                                                    {file.status}
                                                </div>
                                                {file.error_message && (
                                                    <span className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={file.error_message}>
                                                        {file.error_message}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDistanceToNow(new Date(file.created_at))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        processFile(file.id, file.file_name)
                                                    }}
                                                    disabled={uploading || file.status === 'processing'}
                                                    title="Re-process document"
                                                >
                                                    <RefreshCw className={cn("h-4 w-4", file.status === 'processing' && "animate-spin")} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDeleteId(file.id)
                                                        setDeletePath(file.file_path)
                                                    }}
                                                    disabled={uploading}
                                                    title="Delete document"
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
                            This action cannot be undone. This will permanently delete the document
                            and all its associated vector embeddings.
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
