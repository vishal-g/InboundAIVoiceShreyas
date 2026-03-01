'use client'

import { useState } from 'react'
import DocumentsTab from './documents-tab'
import URLsTab from './urls-tab'
import ChatTab from './chat-tab'
import { FileText, Link as LinkIcon, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgebaseClientProps {
    subAccountId: string
}

export default function KnowledgebaseClient({ subAccountId }: KnowledgebaseClientProps) {
    const [activeTab, setActiveTab] = useState<'documents' | 'urls' | 'chat'>('documents')

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1 border-b pb-px">
                <button
                    onClick={() => setActiveTab('documents')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                        activeTab === 'documents'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                >
                    <FileText className="h-4 w-4" />
                    Documents
                </button>
                <button
                    onClick={() => setActiveTab('urls')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                        activeTab === 'urls'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                >
                    <LinkIcon className="h-4 w-4" />
                    URLs to Crawl
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                        activeTab === 'chat'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                >
                    <MessageSquare className="h-4 w-4" />
                    Chat Test
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'documents' ? (
                    <DocumentsTab subAccountId={subAccountId} />
                ) : activeTab === 'urls' ? (
                    <URLsTab subAccountId={subAccountId} />
                ) : (
                    <ChatTab subAccountId={subAccountId} />
                )}
            </div>
        </div>
    )
}
