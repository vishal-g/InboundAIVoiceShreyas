import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    const admin = createAdminClient()

    try {
        // 1. Get first sub-account (or Demo sub-account)
        const { data: subAccounts } = await admin.from('sub_accounts').select('id').limit(1)
        if (!subAccounts || subAccounts.length === 0) {
            return NextResponse.json({ error: 'No sub-accounts found to attach progress to' }, { status: 400 })
        }
        const subAccountId = subAccounts[0].id

        // 2. Get all steps for 'text_ai_config'
        const { data: sections } = await admin
            .from('checklist_sections')
            .select('id')
            .eq('checklist_type_id', 'text_ai_config')

        if (!sections || sections.length === 0) {
            return NextResponse.json({ error: 'Checklist sections not found. Did you run the SQL script?' }, { status: 400 })
        }

        const sectionIds = sections.map(s => s.id)
        const { data: steps } = await admin
            .from('checklist_steps')
            .select('id, section_id, sort_order')
            .in('section_id', sectionIds)

        if (!steps || steps.length === 0) {
            return NextResponse.json({ error: 'Checklist steps not found.' }, { status: 400 })
        }

        // 3. Generate some random progress: let's say the first 2 sections are 100% done, 3rd is 50% done, rest 0%
        // Let's sort sections theoretically (by assuming id order or just grouped by section_id)
        const progressToInsert: { sub_account_id: string, step_id: string, is_done: boolean }[] = []

        // Group steps by section id
        const stepsBySection: Record<string, typeof steps> = {}
        steps.forEach(step => {
            if (!stepsBySection[step.section_id]) stepsBySection[step.section_id] = []
            stepsBySection[step.section_id].push(step)
        })

        // Just blindly iterate and make some done and some undone
        let doneCount = 0
        const targetDone = Math.floor(steps.length * 0.4) // 40% complete

        for (const step of steps) {
            const isDone = doneCount < targetDone
            if (isDone) doneCount++

            progressToInsert.push({
                sub_account_id: subAccountId,
                step_id: step.id,
                is_done: isDone
            })
        }

        // Insert using upsert
        const { error: insertError } = await admin
            .from('checklist_progress')
            .upsert(progressToInsert, { onConflict: 'sub_account_id,step_id' })

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${doneCount} completed steps and ${steps.length - doneCount} pending steps for sub-account ${subAccountId}`
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
