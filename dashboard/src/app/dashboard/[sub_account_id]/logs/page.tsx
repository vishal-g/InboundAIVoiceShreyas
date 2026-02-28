import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default async function LogsPage(props: { params: Promise<{ sub_account_id: string }> }) {
    const params = await props.params;
    const subAccountId = params.sub_account_id
    const supabase = await createClient()

    // Protect route
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch recent call logs using admin client
    const admin = createAdminClient()
    const { data: callLogs } = await admin
        .from('call_logs')
        .select('*')
        .eq('sub_account_id', subAccountId)
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader className="px-7">
                    <CardTitle>Call Logs & Traces</CardTitle>
                    <CardDescription>
                        Review AI conversational history and system traces for troubleshooting.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Phone Number</TableHead>
                                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                                <TableHead className="hidden md:table-cell">Summary</TableHead>
                                <TableHead className="hidden lg:table-cell">Date</TableHead>
                                <TableHead className="text-right">Transcript</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {callLogs?.map((log) => (
                                <TableRow key={log.id} className="bg-accent/50">
                                    <TableCell>
                                        <div className="font-medium">{log.phone_number || 'Unknown'}</div>
                                        {log.caller_name && (
                                            <div className="text-xs text-muted-foreground">{log.caller_name}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        {log.duration_seconds ? `${log.duration_seconds}s` : '—'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                                        {log.summary || '—'}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="link" size="sm" className="text-xs underline p-0 h-auto">
                                                    View Transcript
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Call Transcript — {log.phone_number}</DialogTitle>
                                                    <DialogDescription>
                                                        {log.created_at ? new Date(log.created_at).toLocaleString() : ''} • Duration: {log.duration_seconds || 0}s
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="mt-4 whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-md">
                                                    {log.transcript || 'No transcript available.'}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!callLogs || callLogs.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">
                                        No calls logged yet.
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
