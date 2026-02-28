import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, PhoneCall } from 'lucide-react'
import { CreateSubAccountButton, SubAccountActions } from './sub-account-client'

export default async function SubAccountsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const admin = createAdminClient()

    const { data: roleData } = await admin
        .from('user_roles')
        .select('role, agency_id')
        .eq('user_id', user?.id)
        .single()

    if (roleData?.role !== 'platform_admin' && roleData?.role !== 'agency_admin') {
        redirect('/dashboard')
    }

    // Fetch sub-accounts with their agency name and settings
    let query = admin
        .from('sub_accounts')
        .select('*, agencies(name), sub_account_settings(assigned_number, llm_model)')
        .order('name')

    // Agency admins only see their own agency's sub-accounts
    if (roleData?.role === 'agency_admin' && roleData?.agency_id) {
        query = query.eq('agency_id', roleData.agency_id)
    }

    const { data: subAccounts } = await query

    // Fetch agencies for the create dialog dropdown
    const { data: agencies } = await admin.from('agencies').select('id, name').order('name')

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="px-7 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Sub-Accounts</CardTitle>
                        <CardDescription>
                            Manage the individual businesses and AI Agents deployed on your platform.
                        </CardDescription>
                    </div>
                    <CreateSubAccountButton agencies={agencies || []} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Agency</TableHead>
                                <TableHead className="hidden md:table-cell">Phone / Model</TableHead>
                                <TableHead className="hidden lg:table-cell">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subAccounts?.map((account: any) => (
                                <TableRow key={account.id}>
                                    <TableCell>
                                        <div className="font-medium">{account.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{account.id.slice(0, 8)}…</div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm">
                                        {account.agencies?.name || '—'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-xs">
                                        <div>{account.sub_account_settings?.[0]?.assigned_number || 'No number'}</div>
                                        <div className="text-muted-foreground">{account.sub_account_settings?.[0]?.llm_model || '—'}</div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                                            {account.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/${account.id}/settings`}>
                                                <Settings className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/${account.id}/logs`}>
                                                <PhoneCall className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <SubAccountActions subAccountId={account.id} subAccountName={account.name} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!subAccounts || subAccounts.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No sub-accounts yet. Click &quot;Add Sub-Account&quot; to create one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
