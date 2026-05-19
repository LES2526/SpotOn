# Spot-On — Testes de API (Postman + Newman)

Coleção de testes end-to-end para a API REST do Spot-On. Os testes correm contra
um servidor de desenvolvimento e validam status codes, schema das respostas e
contratos de cada endpoint.

## Conteúdo

```text
postman/
├── Spot-On.postman_collection.json   # coleção (importável no Postman)
├── Spot-On.postman_environment.json  # variáveis de ambiente (baseUrl, IDs seed)
├── seed-test.ts                      # seed determinístico para a DB de teste
└── README.md
```

## Como funciona o bypass de autenticação

A app usa NextAuth com sessões em base de dados (cookie). Testar isso em Postman
exigia login real + manipulação de cookies. Em alternativa, foi adicionado um
modo de teste que se ativa por variável de ambiente:

- `ENABLE_TEST_AUTH=true` — liga o bypass em [require-auth.ts](../lib/require-auth.ts)
- Cada pedido envia o header `X-Test-User-Id: <id-do-user>` e o `requireAuth()`
  procura esse user diretamente na DB
- Em produção (`ENABLE_TEST_AUTH` não definida) o comportamento é o normal

A coleção Postman injeta o header automaticamente via um *pre-request script* na
raiz, usando `{{hostUserId}}` por defeito. Pedidos que precisem de outro user
(ex.: guest a tentar entrar numa sessão) sobrepõem o header.

## Pré-requisitos

- Node.js + npm
- Base de dados PostgreSQL para testes (recomendada separada da de dev)
- Newman: `make postman-install` (instala `newman` e `newman-reporter-htmlextra` globalmente)

## Setup

1. Criar uma DB de testes (ex.: `spoton_test`) e apontar a `DATABASE_URL` para ela.

2. Correr as migrações e regenerar o cliente Prisma:

   ```bash
   cd spot-on
   DATABASE_URL=postgres://.../spoton_test npx prisma migrate deploy
   npx prisma generate
   ```

3. Aplicar o seed de teste (cria utilizadores e espaços com IDs determinísticos):

   ```bash
   cd spot-on
   DATABASE_URL=postgres://.../spoton_test make postman-seed
   ```

4. Arrancar o servidor com o bypass de auth ativo:

   ```bash
   cd spot-on
   ENABLE_TEST_AUTH=true DATABASE_URL=postgres://.../spoton_test QR_SECRET=test-secret npm run dev
   ```

## Correr os testes

### Modo automático (recomendado)

Um único comando carrega o `.env.test`, corre migrações, aplica o seed, arranca
o servidor em background, corre o Newman e desliga o servidor no fim:

```bash
cd spot-on
make postman-ci
```

Pré-requisitos: `.env.test` configurado, DB de teste acessível e
`make postman-install` já corrido uma vez.

### Modo manual

Para iterar (servidor a correr permanentemente, testes várias vezes):

```bash
cd spot-on
make postman-run
```

Gera um relatório HTML em `postman/reports/report-<timestamp>.html` para anexar
ao relatório do projeto.

### Via Postman (GUI)

1. Importar `Spot-On.postman_collection.json`
2. Importar `Spot-On.postman_environment.json` e selecioná-lo
3. *Collection → Run* para correr tudo

## Cobertura

A coleção cobre os principais fluxos:

| Pasta         | Testa                                                         |
| ------------- | ------------------------------------------------------------- |
| Auth          | 401 quando o header de teste está vazio                       |
| Spaces        | Listar, filtrar (`type`, `hasPowerOutlet`), obter por id, 404 |
| Sessions      | Sessão ativa do espaço, listagem por espaço                   |
| Join requests | Rejeição de QR inválido (403)                                 |
| Leaderboard   | Ordenação por pontos, schema das entradas                     |
| Notifications | Listar pendentes, 404 em recurso inexistente                  |
| QR code       | Endpoint público de display                                   |
| Badges        | Listar badges de um utilizador                                |

## Relação com os testes Jest

Os testes Jest (`spot-on/__tests__/`) cobrem **lógica interna** — funções,
utilities, integrações de DB ao nível do código. Os testes Postman/Newman
cobrem o **sistema visto de fora** — HTTP, contratos de API, comportamento
end-to-end. São complementares.
