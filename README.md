# AdsPro — Dashboard para Gestores de Tráfego

Dashboard SaaS completo para gestores de tráfego com integração à Meta Marketing API.

## Pré-requisitos

- Node.js 20+
- npm 10+
- Docker e Docker Compose (para PostgreSQL local)
- Conta no [Supabase](https://supabase.com)
- Conta de desenvolvedor Meta com acesso à Marketing API

## 1. Clone e instalação

```bash
git clone https://github.com/seu-usuario/adspro.git
cd adspro
npm install
```

## 2. Configuração do Supabase

1. Crie um novo projeto em [supabase.com](https://supabase.com)
2. No painel, vá em **Settings → API** e copie:
   - `URL` → `SUPABASE_URL` e `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Em **Authentication → Providers**, ative o Google OAuth:
   - Adicione as credenciais do Google Cloud Console
   - Configure o redirect URL: `https://seu-projeto.supabase.co/auth/v1/callback`

## 3. Como obter o Meta Access Token e Ad Account ID

1. Acesse o [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecione seu App e clique em **Generate Access Token**
3. Adicione as permissões: `ads_read`, `ads_management`, `business_management`
4. Copie o token gerado
5. Seu Ad Account ID está no formato `act_123456789` — encontre em [Gerenciador de Anúncios](https://business.facebook.com/adsmanager)

## 4. Configuração das variáveis de ambiente

```bash
# API
cp .env.example apps/api/.env
# Edite apps/api/.env com suas credenciais

# Frontend
cp .env.example apps/web/.env
# Edite apps/web/.env com suas credenciais
```

Gere uma APP_SECRET segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Rodando em desenvolvimento

```bash
# Inicia o PostgreSQL local
docker-compose up -d

# Aplica migrações do banco
npm run db:migrate

# Gera o cliente Prisma
npm run db:generate

# Popula dados iniciais (opcional)
npm run db:seed

# Inicia API (porta 3001) e Web (porta 5173) em paralelo
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

## 6. Deploy

### API — Render.com

1. Crie um novo **Web Service** apontando para `apps/api`
2. Build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
3. Start command: `npm start`
4. Adicione todas as variáveis do `apps/api/.env`

### Frontend — Vercel

1. Importe o repositório no Vercel
2. Root directory: `apps/web`
3. Build command: `npm run build`
4. Adicione as variáveis do `apps/web/.env`
5. Atualize `FRONTEND_URL` na API com o domínio gerado

## Arquitetura

```
adspro/
  apps/
    web/          → React 18 + Vite + Tailwind + shadcn/ui
    api/          → Fastify 4 + Prisma + PostgreSQL
  packages/
    types/        → Interfaces TypeScript compartilhadas
    utils/        → Formatadores e helpers
```

## Segurança

- Access tokens da Meta criptografados com AES-256-GCM
- JWT verificado em todas as rotas protegidas
- Rate limiting por IP e por usuário
- CORS restrito ao domínio do frontend
- Tokens nunca expostos ao frontend

## Licença

MIT
