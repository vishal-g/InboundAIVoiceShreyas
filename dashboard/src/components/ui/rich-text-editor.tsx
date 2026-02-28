'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Heading from '@tiptap/extension-heading'
import { Bold, Italic, Strikethrough, List, ListOrdered, Link as LinkIcon, Info, CheckCircle2, AlertTriangle, Heading1, Heading2, Heading3, Code } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Callout } from './extensions/callout'
import { useEffect, useState } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const [isHtmlMode, setIsHtmlMode] = useState(false)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Callout,
            Heading.configure({ levels: [1, 2, 3] }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline underline-offset-4',
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'min-h-[250px] w-full rounded-md border border-input bg-background/50 px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 !outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Update editor content if value changes externally
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [editor, value])

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="min-h-[250px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
    }

    if (isHtmlMode) {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-1 border border-input p-1 rounded-md bg-muted/40">
                    <span className="text-xs font-medium text-muted-foreground ml-2">HTML Editor</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHtmlMode(false)}
                        className="h-8 px-2 text-xs"
                    >
                        Switch to Visual
                    </Button>
                </div>
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="min-h-[250px] font-mono text-xs"
                />
            </div>
        )
    }

    if (!editor) return null

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        // cancelled
        if (url === null) {
            return
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        // update link
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <div className="flex flex-col gap-2 tiptap-editor-wrapper">
            <div className="flex flex-wrap items-center justify-between gap-1 border border-input p-1 rounded-md bg-muted/40">
                <div className="flex flex-wrap items-center gap-1">
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('bold')}
                        onPressedChange={() => editor.chain().focus().toggleBold().run()}
                        aria-label="Toggle bold"
                    >
                        <Bold className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('italic')}
                        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                        aria-label="Toggle italic"
                    >
                        <Italic className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('strike')}
                        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                        aria-label="Toggle strikethrough"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Toggle>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('heading', { level: 1 })}
                        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        aria-label="Toggle heading 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('heading', { level: 2 })}
                        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        aria-label="Toggle heading 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('heading', { level: 3 })}
                        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        aria-label="Toggle heading 3"
                    >
                        <Heading3 className="h-4 w-4" />
                    </Toggle>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('bulletList')}
                        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                        aria-label="Toggle bullet list"
                    >
                        <List className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('orderedList')}
                        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                        aria-label="Toggle ordered list"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Toggle>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('link')}
                        onPressedChange={setLink}
                        aria-label="Toggle link"
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Toggle>

                    <div className="w-px h-4 bg-border mx-1" />

                    <Toggle
                        size="sm"
                        pressed={editor.isActive('callout', { type: 'info' })}
                        onPressedChange={() => editor.commands.toggleCallout({ type: 'info' })}
                        aria-label="Info Callout"
                        className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                    >
                        <Info className="h-4 w-4 text-blue-500" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('callout', { type: 'success' })}
                        onPressedChange={() => editor.commands.toggleCallout({ type: 'success' })}
                        aria-label="Success Callout"
                        className="data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
                    >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </Toggle>
                    <Toggle
                        size="sm"
                        pressed={editor.isActive('callout', { type: 'warning' })}
                        onPressedChange={() => editor.commands.toggleCallout({ type: 'warning' })}
                        aria-label="Warning Callout"
                        className="data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700"
                    >
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </Toggle>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHtmlMode(true)}
                    className="h-8 px-2 text-xs text-muted-foreground ml-auto"
                >
                    <Code className="h-4 w-4 mr-1" /> HTML
                </Button>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
