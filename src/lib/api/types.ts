export type ID = string;

export type CategoriaTipo = "receita" | "despesa";
export type Recorrencia = "nenhuma" | "mensal" | "quinzenal" | "semanal" | "anual";
export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito" | "boleto" | "transferencia";

export interface Categoria {
  id: ID;
  nome: string;
  tipo: CategoriaTipo;
  cor?: string;
  padrao?: boolean;
}

export interface Receita {
  id: ID;
  descricao: string;
  valor: number;
  data: string; // ISO YYYY-MM-DD
  categoriaId: ID;
  observacao?: string;
  recorrencia: Recorrencia;
}

export interface Despesa {
  id: ID;
  descricao: string;
  valor: number;
  data: string;
  categoriaId: ID;
  formaPagamento: FormaPagamento;
  cartaoId?: ID;
  observacao?: string;
  recorrencia: Recorrencia;
  parcelas?: number;
  parcelaAtual?: number;
  compraGrupoId?: ID; // agrupa parcelas de uma compra
}

export interface Cartao {
  id: ID;
  nome: string;
  bandeira?: string;
  limite: number;
  diaFechamento: number; // 1..28
  diaVencimento: number; // 1..28
  cor?: string;
}

export interface Usuario {
  id: ID;
  email: string;
  nome: string;
}

export interface Configuracoes {
  usuario: Usuario;
}