# Como publicar o "Viaja que rola" com banco de dados real

Guia passo a passo, sem precisar saber programar. Duração: ~20-30 minutos.

## Parte 1 — Criar o banco de dados (Supabase)

1. Acesse https://supabase.com e crie uma conta gratuita.
2. Clique em **New project**. Dê um nome (ex: `viaja-que-rola`) e uma senha forte para o banco (guarde-a, mas não vai precisar dela no dia a dia).
3. Espere o projeto terminar de ser criado (leva 1-2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `schema.sql` (está junto com este guia), copie todo o conteúdo, cole no editor do Supabase e clique em **Run**.
   - Isso cria a tabela `app_data`, que vai guardar todos os dados do seu painel, e as regras de segurança que garantem que cada usuário só vê os próprios dados.
6. Vá em **Project Settings** (ícone de engrenagem) → **API**.
   - Copie o **Project URL** — algo como `https://xxxxx.supabase.co`
   - Copie a chave **anon public**
   - Você vai usar essas duas informações na Parte 3.
7. (Opcional, recomendado) Vá em **Authentication** → **Providers** → **Email** e desative "Confirm email" se quiser testar rapidamente sem precisar confirmar por e-mail. Para uso "de verdade" depois, pode deixar ativado.

## Parte 2 — Colocar o código no GitHub

1. Crie uma conta gratuita em https://github.com (se ainda não tiver).
2. Clique em **New repository**, dê o nome `viaja-que-rola`, deixe como **Private**, e crie.
3. Na página do repositório vazio, clique em **uploading an existing file** e arraste TODOS os arquivos da pasta do projeto (menos a pasta `node_modules`, que nem existe ainda).
4. Clique em **Commit changes**.

## Parte 3 — Publicar o site (Vercel)

1. Acesse https://vercel.com e crie uma conta (pode entrar direto com sua conta do GitHub).
2. Clique em **Add New** → **Project**.
3. Selecione o repositório `viaja-que-rola` que você acabou de subir.
4. A Vercel vai detectar automaticamente que é um projeto Vite. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - `VITE_SUPABASE_URL` → cole o Project URL que você copiou na Parte 1
   - `VITE_SUPABASE_ANON_KEY` → cole a chave anon public
5. Clique em **Deploy**. Espere 1-2 minutos.
6. Pronto — a Vercel te dá um link tipo `viaja-que-rola.vercel.app`. Esse é o seu site, no ar, com banco de dados real.

## Parte 4 — Usar

1. Abra o link. Você verá a tela de login do "Viaja que rola".
2. Clique em "Não tem conta? Criar agora", cadastre seu e-mail e uma senha.
3. Se deixou a confirmação de e-mail ativada no Supabase, confirme pelo e-mail recebido.
4. Pronto — está tudo salvo no banco de dados real, acessível de qualquer dispositivo.

## Domínio próprio (opcional)

Depois de publicado, em **Project Settings → Domains** na Vercel, você pode conectar um domínio próprio como `viajaquerola.com.br`, se já tiver um registrado (ou comprar um em serviços como Registro.br).

## Dando acesso a outras pessoas

Cada pessoa que criar uma conta (e-mail/senha) na tela de login terá seu próprio espaço de dados isolado — ninguém vê os dados de ninguém, graças às regras de segurança do banco (RLS). Se quiser que só você e mais alguém específico tenham acesso, dá para desativar o cadastro aberto e criar contas manualmente pelo painel do Supabase (Authentication → Users → Add user). Posso te ajudar a configurar isso quando chegar a hora.
