import { useGetAuditLog } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ClipboardList } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  Added: "bg-green-100 text-green-800",
  Edited: "bg-blue-100 text-blue-800",
  Deleted: "bg-red-100 text-red-800",
};

const TYPE_COLORS: Record<string, string> = {
  Job: "bg-sky-100 text-sky-800",
  Client: "bg-purple-100 text-purple-800",
  Expense: "bg-orange-100 text-orange-800",
  Receipt: "bg-yellow-100 text-yellow-800",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ActivityLog() {
  const { data: entries, isLoading } = useGetAuditLog({ limit: 200, offset: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Activity Log</h1>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white">Time</TableHead>
                <TableHead className="text-white">User</TableHead>
                <TableHead className="text-white">Action</TableHead>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-32"><Spinner /></TableCell></TableRow>
              ) : !entries || entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32 text-gray-500">
                    No activity recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={entry.id} className="hover:bg-gray-50">
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(entry.timestamp)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{entry.username}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-800"}>
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TYPE_COLORS[entry.recordType] ?? "bg-gray-100 text-gray-800"}>
                        {entry.recordType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">{entry.details}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {entries && entries.length > 0 && (
          <CardContent className="py-3 border-t text-xs text-gray-400">
            {entries.length} entries shown, newest first
          </CardContent>
        )}
      </Card>
    </div>
  );
}
