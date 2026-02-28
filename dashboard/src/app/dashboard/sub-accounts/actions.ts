'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdminRole() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { admin: null, userId: null, error: 'Unauthorized' }

    const admin = createAdminClient()
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role, agency_id')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'platform_admin' && roleData?.role !== 'agency_admin') {
        return { admin: null, userId: null, error: 'Insufficient permissions' }
    }
    return { admin, userId: user.id, role: roleData.role, agencyId: roleData.agency_id, error: null }
}

export async function createSubAccount(_prevState: any, formData: FormData) {
    const { admin, error: authError } = await requireAdminRole()
    if (authError || !admin) return { success: false, error: authError }

    const name = formData.get('name') as string
    const agencyId = formData.get('agency_id') as string
    const assignedNumber = formData.get('assigned_number') as string

    if (!name?.trim()) return { success: false, error: 'Sub-account name is required' }
    if (!agencyId) return { success: false, error: 'Agency is required' }

    const { data: subAccount, error } = await admin
        .from('sub_accounts')
        .insert({ name: name.trim(), agency_id: agencyId, is_active: true })
        .select('id')
        .single()

    if (error) return { success: false, error: error.message }

    // Auto-initialize default settings
    const { error: settingsError } = await admin
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
    const { admin, error: authError } = await requireAdminRole()
    if (authError || !admin) return { success: false, error: authError }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const isActive = formData.get('is_active') === 'true'

    const { error } = await admin
        .from('sub_accounts')
        .update({ name, is_active: isActive })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/sub-accounts')
    return { success: true, error: null }
}

export async function deleteSubAccount(id: string) {
    const { admin, error: authError } = await requireAdminRole()
    if (authError || !admin) return { success: false, error: authError }

    await admin.from('sub_account_settings').delete().eq('sub_account_id', id)
    const { error } = await admin.from('sub_accounts').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/sub-accounts')
    return { success: true, error: null }
}
