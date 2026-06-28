import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonth } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface Props {
  date: Date;
  onChange: (d: Date) => void;
}

export function MonthCarousel({ date, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-2 py-1.5 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(date, -1))}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <div className="text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Mês</div>
        <div className="font-display text-base font-semibold capitalize">{formatMonth(date)}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(date, 1))}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}