-- A senha do usuário demo era gravada em texto puro pela migration de seed.
-- A partir de agora o servidor compara SHA-256(senha) com senha_hash, então
-- atualizamos o valor gravado para o hash correspondente de "demo1234".
UPDATE usuarios
SET senha_hash = '0ead2060b65992dca4769af601a1b3a35ef38cfad2c2c465bb160ea764157c5d'
WHERE id = 'demo-user-1';
