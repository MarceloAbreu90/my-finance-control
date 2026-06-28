import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { formatBRL, formatDate } from "@/lib/format";
import { Wallet, CreditCard, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Hit =
  | { kind: "receita"; id: string; descricao: string; valor: number; data: string }
  | { kind: "despesa"; id: string; descricao: string; valor: number; data: string; cartao?: boolean };

export function GlobalSearch({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Hit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [receitas, despesas] = await Promise.all([api.listReceitas(), api.listDespesas()]);
      const hits: Hit[] = [
        ...receitas.map((r) => ({ kind: "receita" as const, id: r.id, descricao: r.descricao, valor: r.valor, data: r.data })),
        ...despesas.map((d) => ({
          kind: "despesa" as const,
          id: d.id,
          descricao: d.descricao,
          valor: d.valor,
          data: d.data,
          cartao: d.formaPagamento === "credito",
        })),
      ];
      setAll(hits);
    })();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 12);
    return all.filter((h) => h.descricao.toLowerCase().includes(q)).slice(0, 30);
  }, [query, all]);

  const go = (h: Hit) => {
    onOpenChange(false);
    if (h.kind === "despesa" && h.cartao) navigate({ to: "/cartoes" });
    else navigate({ to: "/financeiro" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Buscar lançamentos</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Digite uma descrição…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado
            </li>
          )}
          {results.map((h) => (
            <li key={h.kind + h.id}>
              <button
                onClick={() => go(h)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
              >
                {h.kind === "receita" ? (
                  <ArrowUpCircle className="size-4 text-success" />
                ) : h.cartao ? (
                  <CreditCard className="size-4 text-primary" />
                ) : (
                  <ArrowDownCircle className="size-4 text-destructive" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{h.descricao}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(h.data)}</div>
                </div>
                <div
                  className={
                    h.kind === "receita"
                      ? "text-sm font-semibold text-success"
                      : "text-sm font-semibold text-destructive"
                  }
                >
                  {h.kind === "receita" ? "+" : "-"}
                  {formatBRL(h.valor)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}