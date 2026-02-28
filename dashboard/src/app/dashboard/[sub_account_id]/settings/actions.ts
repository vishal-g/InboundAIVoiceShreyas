'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateSettings(_prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const subAccountId = formData.get('sub_account_id') as string
    const admin = createAdminClient()

    // Simple RBAC check
    const { data: roleData } = await admin
        .from('user_roles')
        .select('role, sub_account_id')
        .eq('user_id', user.id)
        .single()

    if (
        roleData?.role !== 'platform_admin' &&
        (roleData?.role !== 'sub_account_user' || roleData?.sub_account_id !== subAccountId)
    ) {
        return { success: false, error: 'Unauthorized access to sub-account' }
    }

    const updates = {
        first_line: formData.get('first_line'),
        agent_instructions: formData.get('agent_instructions'),
        llm_model: formData.get('llm_model'),
        tts_voice: formData.get('tts_voice'),
        cal_event_type_id: formData.get('cal_event_type_id'),
        updated_at: new Date().toISOString(),
    }

    const { error } = await admin
        .from('sub_account_settings')
        .update(updates)
        .eq('sub_account_id', subAccountId)

    if (error) {
        console.error('Failed to update settings', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/dashboard/${subAccountId}/settings`)
    return { success: true, error: null }
}
