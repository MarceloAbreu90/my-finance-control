export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatBRL = (v: number) => BRL.format(v ?? 0);

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatMonth = (date: Date) =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addMonths = (date: Date, n: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

export const isSameMonth = (isoDate: string, ref: Date) => {
  const d = new Date(isoDate);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};