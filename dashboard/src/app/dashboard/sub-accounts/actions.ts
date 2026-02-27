'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdminRole() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { supabase: null, userId: null, error: 'Unauthorized' }

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, agency_id')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'platform_admin' && roleData?.role !== 'agency_admin') {
        return { supabase: null, userId: null, error: 'Insufficient permissions' }
    }
    return { supabase, userId: user.id, role: roleData.role, agencyId: roleData.agency_id, error: null }
}

export async function createSubAccount(_prevState: any, formData: FormData) {
    const { supabase, error: authError } = await requireAdminRole()
    if (authError || !supabase) return { success: false, error: authError }

    const name = formData.get('name') as string
    const agencyId = formData.get('agency_id') as string
    const assignedNumber = formData.get('assigned_number') as string

    if (!name?.trim()) return { success: false, error: 'Sub-account name is required' }
    if (!agencyId) return { success: false, error: 'Agency is required' }

    // Create sub-account
    const { data: subAccount, error } = await supabase
        .from('sub_accounts')
        .insert({ name: name.trim(), agency_id: agencyId, is_active: true })
        .select('id')
        .single()

    if (error) return { success: false, error: error.message }

    // Auto-initialize default settings
    const { error: settingsError } = await supabase
        .from('sub_account_settings')
        .insert({
            sub_account_id: subAccount.id,
            assigned_number: assignedNumber || null,
            first_line: 'Hello, how can I help you today?',
            agent_instructions: 'You are a helpful AI assistant.',
            llm_model: 'openai:gpt-4o-mini',
            tts_voice: 'kavya',
        })

    if (settingsError) {
        console.error('Failed to initialize settings:', settingsError)
    }

    revalidatePath('/dashboard/sub-accounts')
    return { success: true, error: null }
}

export async function updateSubAccount(_prevState: any, formData: FormData) {
    const { supabase, error: authError } = await requireAdminRole()
    if (authError || !supabase) return { success: false, error: authError }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const isActive = formData.get('is_active') === 'true'

    const { error } = await supabase
        .from('sub_accounts')
        .update({ name, is_active: isActive })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/sub-accounts')
    return { success: true, error: null }
}

export async function deleteSubAccount(id: string) {
    const { supabase, error: authError } = await requireAdminRole()
    if (authError || !supabase) return { success: false, error: authError }

    // Delete settings first (cascade should handle, but be safe)
    await supabase.from('sub_account_settings').delete().eq('sub_account_id', id)
    const { error } = await supabase.from('sub_accounts').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/sub-accounts')
    return { success: true, error: null }
}
