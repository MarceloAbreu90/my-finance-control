import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, CreditCard, Wallet, TrendingUp, CalendarClock } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Cartao, Categoria, Despesa, Receita } from "@/lib/api/types";
import { formatBRL, formatDate, isSameMonth } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Dashboard — My Finance Control" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const now = new Date();

  useEffect(() => {
    void Promise.all([api.listReceitas(), api.listDespesas(), api.listCartoes(), api.listCategorias()]).then(
      ([r, d, c, cat]) => {
        setReceitas(r);
        setDespesas(d);
        setCartoes(c);
        setCategorias(cat);
      },
    );
  }, []);

  const totalReceitasMes = useMemo(
    () => receitas.filter((r) => isSameMonth(r.data, now)).reduce((a, b) => a + b.valor, 0),
    [receitas],
  );
  const totalDespesasMes = useMemo(
    () => despesas.filter((d) => isSameMonth(d.data, now)).reduce((a, b) => a + b.valor, 0),
    [despesas],
  );
  const totalCartoes = useMemo(
    () =>
      despesas
        .filter((d) => d.formaPagamento === "credito" && isSameMonth(d.data, now))
        .reduce((a, b) => a + b.valor, 0),
    [despesas],
  );
  const saldo = useMemo(
    () =>
      receitas.reduce((a, b) => a + b.valor, 0) -
      despesas.reduce((a, b) => a + b.valor, 0),
    [receitas, despesas],
  );
  const resultadoMes = totalReceitasMes - totalDespesasMes;

  const proximas = useMemo(() => {
    const today = new Date();
    return despesas
      .filter((d) => new Date(d.data) >= new Date(today.toDateString()))
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5);
  }, [despesas]);

  const ultimos = useMemo(() => {
    const merged = [
      ...receitas.map((r) => ({ ...r, kind: "receita" as const })),
      ...despesas.map((d) => ({ ...d, kind: "despesa" as const })),
    ];
    return merged.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6);
  }, [receitas, despesas]);

  const monthlySeries = useMemo(() => {
    const months: { key: string; label: string; receitas: number; despesas: number; saldo: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        receitas: 0,
        despesas: 0,
        saldo: 0,
      });
    }
    let acc = 0;
    months.forEach((m) => {
      receitas
        .filter((r) => r.data.startsWith(m.key))
        .forEach((r) => (m.receitas += r.valor));
      despesas
        .filter((d) => d.data.startsWith(m.key))
        .forEach((d) => (m.despesas += d.valor));
      acc += m.receitas - m.despesas;
      m.saldo = acc;
    });
    return months;
  }, [receitas, despesas]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { nome: string; valor: number; cor: string }>();
    despesas
      .filter((d) => isSameMonth(d.data, now))
      .forEach((d) => {
        const cat = categorias.find((c) => c.id === d.categoriaId);
        const key = cat?.id ?? "outros";
        const cur = map.get(key) ?? { nome: cat?.nome ?? "Outros", valor: 0, cor: cat?.cor ?? "#94a3b8" };
        cur.valor += d.valor;
        map.set(key, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  }, [despesas, categorias]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das suas finanças em{" "}
          <span className="capitalize">
            {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          .
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={<Wallet />} label="Saldo atual" value={formatBRL(saldo)} tone={saldo >= 0 ? "success" : "destructive"} />
        <Kpi icon={<ArrowUpRight />} label="Receitas (mês)" value={formatBRL(totalReceitasMes)} tone="success" />
        <Kpi icon={<ArrowDownRight />} label="Despesas (mês)" value={formatBRL(totalDespesasMes)} tone="destructive" />
        <Kpi
          icon={<TrendingUp />}
          label="Resultado (mês)"
          value={formatBRL(resultadoMes)}
          tone={resultadoMes >= 0 ? "success" : "destructive"}
        />
        <Kpi icon={<CreditCard />} label="Cartões (mês)" value={formatBRL(totalCartoes)} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas × Despesas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="receitas" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porCategoria.length === 0 ? (
              <EmptyChart label="Sem despesas este mês" />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={porCategoria}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {porCategoria.map((c, i) => (
                      <Cell key={i} fill={c.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do saldo</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer>
            <LineChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Line type="monotone" dataKey="saldo" stroke="var(--color-primary)" strokeWidth={2.5} dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimos lançamentos</CardTitle>
            <Link to="/financeiro" className="text-xs text-primary hover:underline">
              Ver tudo
            </Link>
          </CardHeader>
          <CardContent>
            {ultimos.length === 0 ? (
              <Empty label="Nenhum lançamento ainda." />
            ) : (
              <ul className="divide-y">
                {ultimos.map((u) => (
                  <li key={u.kind + u.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm font-medium">{u.descricao}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(u.data)}</div>
                    </div>
                    <div
                      className={
                        u.kind === "receita"
                          ? "text-sm font-semibold text-success"
                          : "text-sm font-semibold text-destructive"
                      }
                    >
                      {u.kind === "receita" ? "+" : "-"}
                      {formatBRL(u.valor)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Próximas contas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximas.length === 0 ? (
              <Empty label="Sem contas próximas." />
            ) : (
              <ul className="divide-y">
                {proximas.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm font-medium">{d.descricao}</div>
                      <div className="text-xs text-muted-foreground">Vence em {formatDate(d.data)}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatBRL(d.valor)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "destructive" | "primary";
}) {
  const toneClass = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className={`mb-3 inline-flex size-8 items-center justify-center rounded-lg ${toneClass}`}>
        <span className="[&_svg]:size-4">{icon}</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{value}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="py-6 text-center text-sm text-muted-foreground">{label}</div>;
}
function EmptyChart({ label }: { label: string }) {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">{label}</div>;
}