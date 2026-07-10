INSERT INTO usuarios (id, email, nome, senha_hash) VALUES
  ('demo-user-1', 'demo@finance.app', 'Usuário Demo', 'demo1234');

INSERT INTO categorias (id, usuario_id, nome, tipo, cor, padrao) VALUES
  ('cat-salario',      'demo-user-1', 'Salário',       'receita', '#16a34a', 1),
  ('cat-freelance',    'demo-user-1', 'Freelance',     'receita', '#22c55e', 1),
  ('cat-investimentos','demo-user-1', 'Investimentos', 'receita', '#14b8a6', 1),
  ('cat-alimentacao',  'demo-user-1', 'Alimentação',   'despesa', '#ef4444', 1),
  ('cat-moradia',      'demo-user-1', 'Moradia',       'despesa', '#f97316', 1),
  ('cat-transporte',   'demo-user-1', 'Transporte',    'despesa', '#eab308', 1),
  ('cat-saude',        'demo-user-1', 'Saúde',         'despesa', '#06b6d4', 1),
  ('cat-lazer',        'demo-user-1', 'Lazer',         'despesa', '#8b5cf6', 1),
  ('cat-educacao',     'demo-user-1', 'Educação',      'despesa', '#3b82f6', 1);