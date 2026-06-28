import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Repeat, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { Cartao, Categoria, Despesa, FormaPagamento, Receita, Recorrencia } from "@/lib/api/types";
import { formatBRL, formatDate, isSameMonth, todayISO } from "@/lib/format";
import { MonthCarousel } from "@/components/MonthCarousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — My Finance Control" }] }),
  component: Financeiro,
});

const RECORRENCIA_OPTS: { value: Recorrencia; label: string }[] = [
  { value: "nenhuma", label: "Não recorrente" },
  { value: "mensal", label: "Mensal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "semanal", label: "Semanal" },
  { value: "anual", label: "Anual" },
];

const FORMA_OPTS: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

function Financeiro() {
  const [date, setDate] = useState(new Date());
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);

  const [receitaForm, setReceitaForm] = useState<Receita | null>(null);
  const [despesaForm, setDespesaForm] = useState<Despesa | null>(null);

  const reload = async () => {
    const [r, d, c, ca] = await Promise.all([
      api.listReceitas(),
      api.listDespesas(),
      api.listCategorias(),
      api.listCartoes(),
    ]);
    setReceitas(r);
    setDespesas(d);
    setCategorias(c);
    setCartoes(ca);
  };

  useEffect(() => {
    void reload();
  }, []);

  const receitasMes = useMemo(
    () => receitas.filter((r) => isSameMonth(r.data, date)),
    [receitas, date],
  );
  const receitasRec = useMemo(
    () => receitas.filter((r) => r.recorrencia !== "nenhuma"),
    [receitas],
  );
  // Despesas no mês — agrupa crédito em uma única linha por cartão
  const { despesasMesView, despesasRec } = useMemo(() => {
    const noMes = despesas.filter((d) => isSameMonth(d.data, date));
    const naoCredito = noMes.filter((d) => d.formaPagamento !== "credito");
    const credito = noMes.filter((d) => d.formaPagamento === "credito");
    const porCartao = new Map<string, number>();
    credito.forEach((d) => {
      const k = d.cartaoId ?? "sem";
      porCartao.set(k, (porCartao.get(k) ?? 0) + d.valor);
    });
    const consolidadas: Despesa[] = Array.from(porCartao.entries()).map(([cartaoId, valor]) => {
      const cartao = cartoes.find((c) => c.id === cartaoId);
      return {
        id: `fatura-${cartaoId}`,
        descricao: `Fatura ${cartao?.nome ?? "Cartão"}`,
        valor,
        data: date.toISOString().slice(0, 10),
        categoriaId: "",
        formaPagamento: "credito",
        cartaoId,
        recorrencia: "nenhuma",
      };
    });
    return {
      despesasMesView: [...naoCredito, ...consolidadas].sort((a, b) => a.data.localeCompare(b.data)),
      despesasRec: despesas.filter((d) => d.recorrencia !== "nenhuma" && d.formaPagamento !== "credito"),
    };
  }, [despesas, date, cartoes]);

  const removeReceita = async (id: string) => {
    if (!confirm("Excluir esta receita?")) return;
    await api.deleteReceita(id);
    toast.success("Receita excluída");
    reload();
  };
  const removeDespesa = async (id: string) => {
    if (id.startsWith("fatura-")) {
      toast.info("Detalhamento de cartão na tela Cartões.");
      return;
    }
    if (!confirm("Excluir esta despesa?")) return;
    await api.deleteDespesa(id);
    toast.success("Despesa excluída");
    reload();
  };

  const catNome = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Receitas e despesas do mês selecionado.</p>
        </div>
        <div className="w-full sm:w-72">
          <MonthCarousel date={date} onChange={setDate} />
        </div>
      </header>

      <Tabs defaultValue="receitas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="receitas" className="gap-1.5">
            <ArrowUpRight className="size-4 text-success" /> Receitas
          </TabsTrigger>
          <TabsTrigger value="despesas" className="gap-1.5">
            <ArrowDownRight className="size-4 text-destructive" /> Despesas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                setReceitaForm({
                  id: "",
                  descricao: "",
                  valor: 0,
                  data: todayISO(),
                  categoriaId: categorias.find((c) => c.tipo === "receita")?.id ?? "",
                  recorrencia: "nenhuma",
                  observacao: "",
                })
              }
              className="gap-2"
            >
              <Plus className="size-4" /> Nova receita
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receitas do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <RowList
                items={receitasMes.map((r) => ({
                  id: r.id,
                  title: r.descricao,
                  subtitle: `${formatDate(r.data)} • ${catNome(r.categoriaId)}`,
                  recorrente: r.recorrencia !== "nenhuma",
                  value: r.valor,
                  tone: "success",
                  onEdit: () => setReceitaForm(r),
                  onDelete: () => removeReceita(r.id),
                }))}
                emptyLabel="Nenhuma receita neste mês."
              />
            </CardContent>
          </Card>

          {receitasRec.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="size-4" /> Receitas recorrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RowList
                  items={receitasRec.map((r) => ({
                    id: r.id,
                    title: r.descricao,
                    subtitle: `${catNome(r.categoriaId)} • ${r.recorrencia}`,
                    value: r.valor,
                    tone: "success",
                    onEdit: () => setReceitaForm(r),
                    onDelete: () => removeReceita(r.id),
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="despesas" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                setDespesaForm({
                  id: "",
                  descricao: "",
                  valor: 0,
                  data: todayISO(),
                  categoriaId: categorias.find((c) => c.tipo === "despesa")?.id ?? "",
                  formaPagamento: "pix",
                  recorrencia: "nenhuma",
                  observacao: "",
                })
              }
              className="gap-2"
            >
              <Plus className="size-4" /> Nova despesa
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Despesas do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <RowList
                items={despesasMesView.map((d) => ({
                  id: d.id,
                  title: d.descricao,
                  subtitle: d.id.startsWith("fatura-")
                    ? `Fatura consolidada • ver Cartões`
                    : `${formatDate(d.data)} • ${catNome(d.categoriaId)} • ${d.formaPagamento}`,
                  recorrente: d.recorrencia !== "nenhuma",
                  value: d.valor,
                  tone: "destructive",
                  onEdit: d.id.startsWith("fatura-") ? undefined : () => setDespesaForm(d),
                  onDelete: () => removeDespesa(d.id),
                }))}
                emptyLabel="Nenhuma despesa neste mês."
              />
            </CardContent>
          </Card>

          {despesasRec.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="size-4" /> Despesas recorrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RowList
                  items={despesasRec.map((d) => ({
                    id: d.id,
                    title: d.descricao,
                    subtitle: `${catNome(d.categoriaId)} • ${d.recorrencia}`,
                    value: d.valor,
                    tone: "destructive",
                    onEdit: () => setDespesaForm(d),
                    onDelete: () => removeDespesa(d.id),
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ReceitaDialog
        value={receitaForm}
        onClose={() => setReceitaForm(null)}
        categorias={categorias.filter((c) => c.tipo === "receita")}
        onSaved={() => {
          setReceitaForm(null);
          reload();
        }}
      />
      <DespesaDialog
        value={despesaForm}
        onClose={() => setDespesaForm(null)}
        categorias={categorias.filter((c) => c.tipo === "despesa")}
        cartoes={cartoes}
        onSaved={() => {
          setDespesaForm(null);
          reload();
        }}
      />
    </div>
  );
}

function RowList({
  items,
  emptyLabel,
}: {
  items: {
    id: string;
    title: string;
    subtitle: string;
    recorrente?: boolean;
    value: number;
    tone: "success" | "destructive";
    onEdit?: () => void;
    onDelete?: () => void;
  }[];
  emptyLabel?: string;
}) {
  if (items.length === 0)
    return <div className="py-8 text-center text-sm text-muted-foreground">{emptyLabel ?? "—"}</div>;
  return (
    <ul className="divide-y">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{it.title}</span>
              {it.recorrente && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                  <Repeat className="size-3" /> recorrente
                </span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>
          </div>
          <div
            className={
              it.tone === "success"
                ? "text-sm font-semibold text-success"
                : "text-sm font-semibold text-destructive"
            }
          >
            {it.tone === "success" ? "+" : "-"}
            {formatBRL(it.value)}
          </div>
          <div className="flex gap-1">
            {it.onEdit && (
              <Button variant="ghost" size="icon" onClick={it.onEdit} aria-label="Editar">
                <Pencil className="size-4" />
              </Button>
            )}
            {it.onDelete && (
              <Button variant="ghost" size="icon" onClick={it.onDelete} aria-label="Excluir">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReceitaDialog({
  value,
  onClose,
  onSaved,
  categorias,
}: {
  value: Receita | null;
  onClose: () => void;
  onSaved: () => void;
  categorias: Categoria[];
}) {
  const [form, setForm] = useState<Receita | null>(value);
  useEffect(() => setForm(value), [value]);
  if (!form) return null;
  const isNew = form.id === "";

  const save = async () => {
    if (!form.descricao || !form.valor || !form.categoriaId) {
      toast.error("Preencha descrição, valor e categoria.");
      return;
    }
    if (isNew) {
      const { id: _ignore, ...payload } = form;
      void _ignore;
      await api.createReceita(payload);
    }
    else await api.updateReceita(form.id, form);
    toast.success(isNew ? "Receita criada" : "Receita atualizada");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Nova receita" : "Editar receita"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Descrição">
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <Input
                type="number"
                step="0.01"
                value={form.valor || ""}
                onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={form.categoriaId} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Recorrência">
            <Select value={form.recorrencia} onValueChange={(v) => setForm({ ...form, recorrencia: v as Recorrencia })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECORRENCIA_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Observação">
            <Textarea rows={2} value={form.observacao ?? ""} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DespesaDialog({
  value,
  onClose,
  onSaved,
  categorias,
  cartoes,
}: {
  value: Despesa | null;
  onClose: () => void;
  onSaved: () => void;
  categorias: Categoria[];
  cartoes: Cartao[];
}) {
  const [form, setForm] = useState<Despesa | null>(value);
  const [parcelas, setParcelas] = useState(1);
  useEffect(() => {
    setForm(value);
    setParcelas(value?.parcelas ?? 1);
  }, [value]);
  if (!form) return null;
  const isNew = form.id === "";

  const save = async () => {
    if (!form.descricao || !form.valor || !form.categoriaId) {
      toast.error("Preencha descrição, valor e categoria.");
      return;
    }
    if (form.formaPagamento === "credito" && !form.cartaoId) {
      toast.error("Selecione o cartão.");
      return;
    }
    if (isNew) {
      const { id: _ignore, ...payload } = form;
      void _ignore;
      await api.createDespesa({
        ...payload,
        parcelas: form.formaPagamento === "credito" ? parcelas : 1,
      });
    } else {
      await api.updateDespesa(form.id, form);
    }
    toast.success(isNew ? "Despesa criada" : "Despesa atualizada");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Nova despesa" : "Editar despesa"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Descrição">
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <Input
                type="number"
                step="0.01"
                value={form.valor || ""}
                onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={form.categoriaId} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Forma de pagamento">
              <Select
                value={form.formaPagamento}
                onValueChange={(v) =>
                  setForm({ ...form, formaPagamento: v as FormaPagamento, cartaoId: v === "credito" ? form.cartaoId : undefined })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMA_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Recorrência">
              <Select value={form.recorrencia} onValueChange={(v) => setForm({ ...form, recorrencia: v as Recorrencia })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORRENCIA_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {form.formaPagamento === "credito" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cartão">
                <Select value={form.cartaoId ?? ""} onValueChange={(v) => setForm({ ...form, cartaoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cartoes.length === 0 && <SelectItem value="" disabled>Cadastre um cartão</SelectItem>}
                    {cartoes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {isNew && (
                <Field label="Parcelas">
                  <Input
                    type="number"
                    min={1}
                    max={48}
                    value={parcelas}
                    onChange={(e) => setParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </Field>
              )}
            </div>
          )}
          <Field label="Observação">
            <Textarea rows={2} value={form.observacao ?? ""} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}