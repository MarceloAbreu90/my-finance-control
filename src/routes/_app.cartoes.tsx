import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { Cartao, Categoria, Despesa } from "@/lib/api/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/cartoes")({
  head: () => ({ meta: [{ title: "Cartões — My Finance Control" }] }),
  component: CartoesPage,
});

function CartoesPage() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cartaoId, setCartaoId] = useState<string>("");
  const [date, setDate] = useState(new Date());
  const [q, setQ] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [order, setOrder] = useState<"data" | "valor">("data");
  const [editing, setEditing] = useState<Despesa | null>(null);
  const [cartaoForm, setCartaoForm] = useState<Cartao | null>(null);

  const reload = async () => {
    const [c, d, cat] = await Promise.all([api.listCartoes(), api.listDespesas(), api.listCategorias()]);
    setCartoes(c);
    setDespesas(d);
    setCategorias(cat);
    if (!cartaoId && c[0]) setCartaoId(c[0].id);
  };
  useEffect(() => {
    void reload();
  }, []);

  const cartao = cartoes.find((c) => c.id === cartaoId);

  const compras = useMemo(() => {
    if (!cartao) return [];
    let list = despesas.filter(
      (d) => d.cartaoId === cartao.id && d.formaPagamento === "credito" && isSameMonth(d.data, date),
    );
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((d) => d.descricao.toLowerCase().includes(t));
    }
    if (filtroCat !== "todas") list = list.filter((d) => d.categoriaId === filtroCat);
    list = [...list].sort((a, b) =>
      order === "data" ? a.data.localeCompare(b.data) : b.valor - a.valor,
    );
    return list;
  }, [despesas, cartao, date, q, filtroCat, order]);

  const totalFatura = useMemo(() => compras.reduce((a, b) => a + b.valor, 0), [compras]);

  const limiteUsado = useMemo(() => {
    if (!cartao) return 0;
    return despesas
      .filter((d) => d.cartaoId === cartao.id && d.formaPagamento === "credito")
      .reduce((a, b) => a + b.valor, 0);
  }, [despesas, cartao]);

  const totalPorCategoria = useMemo(() => {
    const map = new Map<string, number>();
    compras.forEach((d) => map.set(d.categoriaId, (map.get(d.categoriaId) ?? 0) + d.valor));
    return Array.from(map.entries()).map(([id, valor]) => ({
      nome: categorias.find((c) => c.id === id)?.nome ?? "—",
      valor,
    }));
  }, [compras, categorias]);

  const removeCompra = async (id: string) => {
    if (!confirm("Excluir esta compra?")) return;
    await api.deleteDespesa(id);
    toast.success("Compra excluída");
    reload();
  };

  const removeCartao = async (id: string) => {
    if (!confirm("Excluir cartão e todas as suas compras?")) return;
    await api.deleteCartao(id);
    setCartaoId("");
    toast.success("Cartão excluído");
    reload();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Cartões</h1>
          <p className="text-sm text-muted-foreground">Faturas, compras e parcelamentos.</p>
        </div>
        <Button onClick={() => setCartaoForm({ id: "", nome: "", limite: 0, diaFechamento: 1, diaVencimento: 10 })} className="gap-2">
          <Plus className="size-4" /> Novo cartão
        </Button>
      </header>

      {cartoes.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum cartão cadastrado. Crie um para começar.
        </CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {cartoes.map((c) => (
              <button
                key={c.id}
                onClick={() => setCartaoId(c.id)}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                  cartaoId === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-surface text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <CreditCard className="mr-2 inline size-4" />
                {c.nome}
              </button>
            ))}
          </div>

          {cartao && (
            <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <CardContent className="grid gap-4 p-6 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase tracking-widest opacity-80">Cartão</div>
                  <div className="font-display text-xl font-bold">{cartao.nome}</div>
                  {cartao.bandeira && <div className="text-xs opacity-80">{cartao.bandeira}</div>}
                </div>
                <Info label="Fatura atual" value={formatBRL(totalFatura)} />
                <Info
                  label="Limite disponível"
                  value={formatBRL(Math.max(0, cartao.limite - limiteUsado))}
                  sub={`de ${formatBRL(cartao.limite)}`}
                />
                <Info label="Fechamento" value={`Dia ${cartao.diaFechamento}`} />
                <Info label="Vencimento" value={`Dia ${cartao.diaVencimento}`} />
                <div className="flex items-end justify-end gap-1 sm:col-span-2">
                  <Button variant="secondary" size="sm" onClick={() => setCartaoForm(cartao)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => removeCartao(cartao.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {cartao && (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar compra…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <Select value={filtroCat} onValueChange={setFiltroCat}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas categorias</SelectItem>
                    {categorias.filter((c) => c.tipo === "despesa").map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={order} onValueChange={(v) => setOrder(v as "data" | "valor")}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data">Por data</SelectItem>
                    <SelectItem value="valor">Por valor</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-full sm:w-64">
                  <MonthCarousel date={date} onChange={setDate} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Total gasto" value={formatBRL(totalFatura)} />
                <Stat label="Qtd. compras" value={String(compras.length)} />
                <Stat
                  label="Categorias"
                  value={String(totalPorCategoria.length)}
                />
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Compras</CardTitle>
                  <Button
                    size="sm"
                    onClick={() =>
                      setEditing({
                        id: "",
                        descricao: "",
                        valor: 0,
                        data: todayISO(),
                        categoriaId: categorias.find((c) => c.tipo === "despesa")?.id ?? "",
                        formaPagamento: "credito",
                        cartaoId: cartao.id,
                        recorrencia: "nenhuma",
                        parcelas: 1,
                      })
                    }
                    className="gap-2"
                  >
                    <Plus className="size-4" /> Compra
                  </Button>
                </CardHeader>
                <CardContent>
                  {compras.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma compra neste mês.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {compras.map((d) => {
                        const cat = categorias.find((c) => c.id === d.categoriaId);
                        return (
                          <li key={d.id} className="flex items-center gap-3 py-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{d.descricao}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {formatDate(d.data)} • {cat?.nome ?? "—"}
                                {d.parcelas && d.parcelas > 1 && (
                                  <> • {d.parcelaAtual}/{d.parcelas}</>
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-semibold">{formatBRL(d.valor)}</div>
                            <Button variant="ghost" size="icon" onClick={() => setEditing(d)} aria-label="Editar">
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => removeCompra(d.id)} aria-label="Excluir">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      <CompraDialog
        value={editing}
        cartoes={cartoes}
        categorias={categorias.filter((c) => c.tipo === "despesa")}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      <CartaoDialog
        value={cartaoForm}
        onClose={() => setCartaoForm(null)}
        onSaved={() => {
          setCartaoForm(null);
          reload();
        }}
      />
    </div>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-display text-lg font-semibold">{value}</div>
      {sub && <div className="text-[11px] opacity-70">{sub}</div>}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{value}</div>
    </div>
  );
}

function CompraDialog({
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
    if (!form.descricao || !form.valor || !form.categoriaId || !form.cartaoId) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (isNew) {
      const { id: _i, ...payload } = form;
      void _i;
      await api.createDespesa({ ...payload, parcelas });
    } else {
      await api.updateDespesa(form.id, form);
    }
    toast.success(isNew ? "Compra registrada" : "Compra atualizada");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Nova compra" : "Editar compra"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Descrição">
            <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (parcela)">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cartão">
              <Select value={form.cartaoId ?? ""} onValueChange={(v) => setForm({ ...form, cartaoId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={form.categoriaId} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CartaoDialog({
  value,
  onClose,
  onSaved,
}: {
  value: Cartao | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Cartao | null>(value);
  useEffect(() => setForm(value), [value]);
  if (!form) return null;
  const isNew = form.id === "";

  const save = async () => {
    if (!form.nome || !form.limite) {
      toast.error("Informe nome e limite.");
      return;
    }
    if (isNew) {
      const { id: _i, ...payload } = form;
      void _i;
      await api.createCartao(payload);
    } else {
      await api.updateCartao(form.id, form);
    }
    toast.success(isNew ? "Cartão criado" : "Cartão atualizado");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo cartão" : "Editar cartão"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Bandeira"><Input value={form.bandeira ?? ""} onChange={(e) => setForm({ ...form, bandeira: e.target.value })} /></Field>
          <Field label="Limite"><Input type="number" step="0.01" value={form.limite || ""} onChange={(e) => setForm({ ...form, limite: parseFloat(e.target.value) || 0 })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia fechamento"><Input type="number" min={1} max={28} value={form.diaFechamento} onChange={(e) => setForm({ ...form, diaFechamento: parseInt(e.target.value) || 1 })} /></Field>
            <Field label="Dia vencimento"><Input type="number" min={1} max={28} value={form.diaVencimento} onChange={(e) => setForm({ ...form, diaVencimento: parseInt(e.target.value) || 1 })} /></Field>
          </div>
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