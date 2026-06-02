import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRange, PRESET_LABELS, type RangePreset } from "@/lib/date-range";

export function DateRangePicker() {
  const { preset, from, to, applyPreset, setFrom, setTo } = useDateRange();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => applyPreset(v as RangePreset)}>
        <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PRESET_LABELS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={from}
        max={to}
        onChange={(e) => setFrom(e.target.value)}
        className="w-40 bg-white"
      />
      <span className="text-sm text-gray-400">to</span>
      <Input
        type="date"
        value={to}
        min={from}
        onChange={(e) => setTo(e.target.value)}
        className="w-40 bg-white"
      />
    </div>
  );
}
