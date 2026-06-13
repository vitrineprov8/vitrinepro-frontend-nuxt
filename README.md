# vitrinepro-frontend-v2

Frontend Nuxt 4 (v4.4.x estável) do produto de hunters (HUNTRIA). Backend NestJS reutilizado: `../vitrinepro-bakend`.

## Primeiros passos
```bash
# 1. Ativar agentes do Claude Code (uma vez)
mkdir -p .claude/agents && cp claude-setup/agents/*.md .claude/agents/

# 2. Instalar e rodar
npm install
npm run dev        # http://localhost:4321 (backend NestJS em http://localhost:3000)
```
`.env` já copiada do projeto v1 (adaptada à convenção `NUXT_PUBLIC_*`). Para produção, ver `.env.example`.

## Estrutura
```
app/
├── assets/css/        tokens.css (design system) + base.css
├── components/ui/     UI kit: Button, Input, Badge, Card, Modal, Drawer, Toaster
├── composables/       useApi (JWT + erros), useToast
├── stores/            auth (Pinia)
├── layouts/           default (marketing) · auth (split) · app (sidebar workspace)
├── middleware/        auth.ts
└── pages/             index (T01), login (T12), app/ (roteador de workspace)
claude-setup/agents/   5 agentes → copiar para .claude/agents/
CLAUDE.md              guia para o Claude Code
PLANO_DESENVOLVIMENTO.md  fases + checklist + gaps do backend
```

## Documentação do produto
- Design system + todas as telas: `../design-spec/` (00–06)
- Regras de negócio do backend: `../REGRAS_DE_NEGOCIO_VITRINEPRO.md`
- Visão de negócio: `../PROPOSTA_NEGOCIO_HUNTER.md`
