'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Bold, Italic, Strikethrough, List, ListOrdered, Link as LinkIcon, Info, CheckCircle2, AlertTriangle, Heading1, Heading2, Heading3 } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Callout } from './extensions/callout'
import { useEffect, useState } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Callout,
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
                class: 'min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-ul:list-disc prose-ol:list-decimal prose-ul:ml-4 prose-ol:ml-4 focus:outline-none',
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

    if (!mounted || !editor) {
        return <div className="min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" />
    }

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
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1 border border-input p-1 rounded-md bg-muted/40">
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

            <EditorContent editor={editor} />
        </div>
    )
}
