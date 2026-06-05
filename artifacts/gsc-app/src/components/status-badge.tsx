import { CheckCircle, Clock, AlertCircle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Paid: "bg-green-100 text-green-800 border-green-200",
    Pending: "bg-red-100 text-red-800 border-red-200",
    Partial: "bg-orange-100 text-orange-800 border-orange-200",
  };
  const icons: Record<string, React.ReactNode> = {
    Paid: <CheckCircle className="h-3 w-3 mr-1" />,
    Pending: <Clock className="h-3 w-3 mr-1" />,
    Partial: <AlertCircle className="h-3 w-3 mr-1" />,
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {icons[status]}
      {status}
    </span>
  );
}

const STATUS_PRIORITY: Record<string, number> = { Pending: 0, Partial: 1, Paid: 2 };

export function worstStatus(statuses: string[]): string {
  if (statuses.length === 0) return "Pending";
  return statuses.reduce((worst, s) => {
    const wp = STATUS_PRIORITY[worst] ?? 99;
    const sp = STATUS_PRIORITY[s] ?? 99;
    return sp < wp ? s : worst;
  });
}
