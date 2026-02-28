'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export type NavigationItem = {
    id: string
    label: string
    href: string
    icon: string
    sort_order: number
    view_mode: 'super_admin' | 'agency' | 'sub_account' | 'all'
    required_role: 'platform_admin' | 'agency_admin' | 'sub_account_user' | 'all'
    is_active: boolean
}

async function requirePlatformAdmin() {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: roleData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'platform_admin') throw new Error('Forbidden')
    return supabase
}

export async function getNavigationItems() {
    const admin = createAdminClient()
    const { data, error } = await admin
        .from('navigation_items')
        .select('*')
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching navigation items:', error)
        return []
    }
    return data as NavigationItem[]
}

export async function upsertNavigationItem(item: Partial<NavigationItem>) {
    try {
        const supabase = await requirePlatformAdmin()

        const { data, error } = await supabase
            .from('navigation_items')
            .upsert({
                ...item,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard', 'layout')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error upserting navigation item:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteNavigationItem(id: string) {
    try {
        const supabase = await requirePlatformAdmin()

        const { error } = await supabase
            .from('navigation_items')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting navigation item:', error)
        return { success: false, error: error.message }
    }
}

export async function updateNavigationOrder(orderedIds: string[]) {
    try {
        const supabase = await requirePlatformAdmin()

        // Batch update using a single RPC or multiple parallel updates
        // For simplicity with Supabase, we'll do them in a loop since it's a small list
        // and usually triggered by a single drag action.
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('navigation_items')
                .update({ sort_order: index })
                .eq('id', id)
        )

        const results = await Promise.all(updates)
        const firstError = results.find(r => r.error)?.error
        if (firstError) throw firstError

        revalidatePath('/dashboard', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating navigation order:', error)
        return { success: false, error: error.message }
    }
}
