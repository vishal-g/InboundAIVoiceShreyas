import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function SubAccountsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single()

    if (roleData?.role !== 'platform_admin' && roleData?.role !== 'agency_admin') {
        redirect('/dashboard')
    }

    // Fetch all sub_accounts
    const { data: subAccounts } = await supabase.from('sub_accounts').select('*').order('name')

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="px-7">
                    <CardTitle>Sub-Accounts</CardTitle>
                    <CardDescription>
                        Manage the individual businesses and AI Agents deployed on your platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account Name</TableHead>
                                <TableHead className="hidden sm:table-cell">GHL ID</TableHead>
                                <TableHead className="hidden md:table-cell">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subAccounts?.map((account) => (
                                <TableRow key={account.id} className="bg-accent/50">
                                    <TableCell>
                                        <div className="font-medium">{account.name}</div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">
                                        {account.ghl_sub_account_id || 'Not Linked'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge className="text-xs" variant="outline">
                                            Configured
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/${account.id}/settings`} className="text-sm underline hover:text-primary mr-4">
                                            Settings
                                        </Link>
                                        <Link href={`/dashboard/${account.id}/logs`} className="text-sm underline hover:text-primary">
                                            Logs
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!subAccounts || subAccounts.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4">
                                        No sub-accounts found.
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
