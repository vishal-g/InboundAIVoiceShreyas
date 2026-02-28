import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import React from 'react';

export interface CalloutOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            /**
             * Toggle a callout
             */
            setCallout: (attributes?: { type: 'info' | 'success' | 'warning' | 'error' }) => ReturnType;
            toggleCallout: (attributes?: { type: 'info' | 'success' | 'warning' | 'error' }) => ReturnType;
        };
    }
}

const CalloutComponent = ({ node }: NodeViewProps) => {
    const { type } = node.attrs;

    let bgClass = 'bg-blue-50 border-blue-200 text-blue-900';
    let icon = 'ℹ️';

    if (type === 'success') {
        bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-900';
        icon = '✅';
    } else if (type === 'warning') {
        bgClass = 'bg-amber-50 border-amber-200 text-amber-900';
        icon = '⚠️';
    } else if (type === 'error') {
        bgClass = 'bg-red-50 border-red-200 text-red-900';
        icon = '❌';
    }

    return (
        <NodeViewWrapper className={`callout rounded-lg border p-4 my-4 flex gap-3 items-start ${bgClass}`}>
            <div className="flex-shrink-0 select-none mt-0.5" contentEditable={false}>{icon}</div>
            <NodeViewContent className="flex-1 min-w-0 [&>p]:m-0" />
        </NodeViewWrapper>
    );
};

export const Callout = Node.create<CalloutOptions>({
    name: 'callout',

    group: 'block',

    content: 'inline*',

    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: element => element.getAttribute('data-type'),
                renderHTML: attributes => {
                    return {
                        'data-type': attributes.type,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="callout"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes({ 'data-type': 'callout' }, HTMLAttributes), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CalloutComponent);
    },

    addCommands() {
        return {
            setCallout: attributes => ({ commands }) => {
                return commands.setNode(this.name, attributes);
            },
            toggleCallout: attributes => ({ commands }) => {
                return commands.toggleNode(this.name, 'paragraph', attributes);
            },
        };
    },
});
