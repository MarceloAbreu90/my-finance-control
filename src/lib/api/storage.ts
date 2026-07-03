import type { Cartao, Categoria, Despesa, Receita, Usuario } from "./types";

const KEY = "mfc:db:v1";

export interface DB {
  usuario: Usuario;
  senhaHash: string; // demo: plaintext for local mock
  categorias: Categoria[];
  receitas: Receita[];
  despesas: Despesa[];
  cartoes: Cartao[];
}

export const uid = () =>
  (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// NOTE: never call uid() at module scope — Cloudflare Workers disallow
// crypto.randomUUID() (and other random/async APIs) during global evaluation.
// Build seed data lazily inside seed().
const defaultCategoriaSeeds: Omit<Categoria, "id">[] = [
  { nome: "Salário", tipo: "receita", padrao: true, cor: "#16a34a" },
  { nome: "Freelance", tipo: "receita", padrao: true, cor: "#22c55e" },
  { nome: "Investimentos", tipo: "receita", padrao: true, cor: "#14b8a6" },
  { nome: "Alimentação", tipo: "despesa", padrao: true, cor: "#ef4444" },
  { nome: "Moradia", tipo: "despesa", padrao: true, cor: "#f97316" },
  { nome: "Transporte", tipo: "despesa", padrao: true, cor: "#eab308" },
  { nome: "Saúde", tipo: "despesa", padrao: true, cor: "#06b6d4" },
  { nome: "Lazer", tipo: "despesa", padrao: true, cor: "#8b5cf6" },
  { nome: "Educação", tipo: "despesa", padrao: true, cor: "#3b82f6" },
];

const seed = (): DB => ({
  usuario: { id: uid(), email: "demo@finance.app", nome: "Usuário Demo" },
  senhaHash: "demo1234",
  categorias: defaultCategoriaSeeds.map((c) => ({ ...c, id: uid() })),
  receitas: [],
  despesas: [],
  cartoes: [],
});

export const loadDB = (): DB => {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const s = seed();
    window.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  try {
    return JSON.parse(raw) as DB;
  } catch {
    const s = seed();
    window.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
};

export const saveDB = (db: DB) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
};

export const mutateDB = (fn: (db: DB) => void) => {
  const db = loadDB();
  fn(db);
  saveDB(db);
  return db;
};