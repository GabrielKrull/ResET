# Guia de Desenvolvimento — ResET

Este documento reúne orientações detalhadas para desenvolvedores que contribuem para o ResET.

Para o estado atual do planejamento, use também `updatedinfodoc.md` (01/11/2026).
`infodoc.md` permanece preservado como documento mestre e histórico; algumas
indicações de status nele são anteriores à implementação da Sprint 0 e da Etapa 1.1.

## 1. Filosofia Arquitetural

- **Monólito Modular:** todo o código reside em pacotes claros sob `apps/` e `packages/`.
- **Desempenho em Primeiro Lugar:** latência baixa, bundles pequenos, sem renderizações desnecessárias.
- **Tipagem Estrita:** TypeScript com `"strict": true` em todos os workspaces.
- **Segurança Contínua:** validação em todas as entradas via Zod, parâmetros SQL seguros via Kysely.

---

## 2. Workspaces do Projeto

### `@reset/shared` (`packages/shared`)

Contém constantes globais, tipos e schemas de validação Zod consumidos tanto pelo backend (`@reset/server`) quanto pelo frontend desktop (`@reset/desktop`).

### `@reset/server` (`apps/server`)

Servidor HTTP construído com Fastify:

- `src/config.ts`: carrega e valida variáveis de ambiente no boot.
- `src/database/`: gerencia a conexão Kysely com pool PostgreSQL e migrações.
- `src/plugins/`: plugins modulares Fastify.
- `src/app.ts`: fábrica da aplicação Fastify para permitir injeção de dependências em testes (`fastify.inject()`).
- `src/server.ts`: bootstrap da aplicação com graceful shutdown para `SIGINT` e `SIGTERM`.

### `@reset/desktop` (`apps/desktop`)

Aplicativo desktop híbrido:

- `src/`: aplicação React 19 + TypeScript + Vite.
- `src/styles/tokens.css`: variáveis CSS com a paleta de cores oficial (#101613, #1B2820, #72C88B).
- `src-tauri/`: backend nativo Rust 2021 compilado com toolchain MSVC.

---

## 3. Banco de Dados e Migrations

As migrações utilizam o `Migrator` nativo do Kysely com `FileMigrationProvider`:

- Localização: `apps/server/src/database/migrations/`
- Padrão de nomenclatura: `001_nome.ts`, `002_nome.ts`
- Comandos:
  ```bash
  npm run migrate --workspace=@reset/server
  ```

---

O servidor não aplica migrations no boot. Em produção, configure as variáveis
de banco no `.env` e execute cada etapa explicitamente:

```bash
docker compose build server
docker compose up -d postgres
docker compose run --rm migration
docker compose up -d server
```

O Compose exige credenciais definidas pelo ambiente e não fornece senhas padrão.
Use `COMPOSE_DATABASE_URL` com o host `postgres` para conexões entre containers.
Para o servidor local, use `DATABASE_URL` com `localhost`.

## 4. URLs por ambiente e CSP do desktop

Defina `VITE_API_URL` em `apps/desktop/.env.development` ou
`apps/desktop/.env.production`, conforme o modo do Vite. O frontend não tem
fallback de URL. A CSP do Tauri limita conexões aos endpoints locais de
desenvolvimento. Antes de distribuir um backend remoto, inclua sua origem HTTPS
na CSP e na configuração do build de produção.

## 5. Testes Automatizados

Os testes estão organizados próximos ao código (`src/__tests__/`):

- `config.test.ts`: testes unitários do schema Zod e carregamento de variáveis.
- `health.test.ts`: testes de endpoints com mocks rápidos sem banco de dados.
- `integration/database.test.ts`: integração real; falha se `DATABASE_URL` estiver
  ausente ou o banco inacessível. Execute com `npm run test:integration`.

## Etapa 1.1 — Saneamento da fundação (concluída)

- Mantenha versionado `apps/desktop/src-tauri/Cargo.lock` para builds reproduzíveis.
- O listener do pool registra metadados seguros sem a mensagem do driver ou credenciais.
- Erros HTTP inesperados retornam mensagem genérica e são registrados internamente;
  rotas inexistentes usam o mesmo formato com código `NOT_FOUND`.
- Em `uncaughtException` e `unhandledRejection`, o servidor registra o erro, tenta
  fechar HTTP e PostgreSQL e encerra com código diferente de zero. Um limite de
  10 segundos evita que a limpeza impeça o reinício.
- Esta etapa não adiciona autenticação nem UUIDv7 ao pacote compartilhado.

### Registro de execução — 2026-11-01

- `npm run build`: passou para shared, servidor e desktop.
- `npm test`: passou, 8 testes unitários.
- `npm run test:integration`: passou contra PostgreSQL 17 real; a suíte agora
  falha explicitamente quando `DATABASE_URL` não é fornecida ou o banco está indisponível.
- `npm run typecheck`: passou nos três workspaces.
- `npm run tauri:build --workspace=@reset/desktop`: passou; gerou o executável
  Windows e os bundles MSI e NSIS.
- `docker compose config --quiet`: passou com credenciais aleatórias de teste.
- Build da imagem, migration explícita (`001_initial`) e inicialização do
  servidor de produção passaram. `/health/ready` retornou `status: ok` e banco
  conectado. Os containers de teste foram encerrados; o volume foi preservado.
- O primeiro teste da imagem encontrou a resolução de `@reset/shared` em runtime;
  o build de produção agora compila o pacote e usa a condição `production`,
  mantendo o import direto dos arquivos TypeScript nos outros ambientes.
- `npm ci` reportou 2 vulnerabilidades altas nas dependências de produção e,
  no estágio de build, 16 no conjunto completo (12 moderadas, 2 altas e 2 críticas).
  Nenhuma dependência foi atualizada nesta etapa.
- A CSP atende o uso local. O hostname HTTPS de produção ainda não foi definido;
  ele precisa ser incluído explicitamente na CSP antes de distribuir o desktop
  apontado para uma API remota.

## Etapa 1.2 — Triagem de dependências (2026-11-01)

**Estado:** correções controladas concluídas em 2026-11-01. O relatório
original da triagem read-only e sua aplicabilidade permanecem abaixo; os
resultados efetivos das atualizações estão na seção de execução ao final.

### Resultado do `npm audit --json`

| Escopo | Entradas | Moderadas | Altas | Críticas |
| --- | ---: | ---: | ---: | ---: |
| Dependências completas | 16 | 12 | 2 | 2 |
| Produção (`--omit=dev`) | 2 | 0 | 2 | 0 |

As contagens são entradas do relatório npm; avisos sobre dependências transitivas
podem representar a mesma cadeia vulnerável, não falhas independentes.

### Dependências afetadas e aplicabilidade observada

| Pacote instalado | Escopo / severidade | Aplicabilidade ao código atual | Correção indicada |
| --- | --- | --- | --- |
| `kysely@0.27.6` | Produção / alta | Os avisos envolvem chaves de JSONPath não confiáveis. O projeto usa PostgreSQL, mas o código atual não usa `jsonPath`, `.key()` ou `.at()`; o schema do banco contém somente `system_meta`. Não há caminho de entrada explorável identificado hoje. | O advisory de JSONPath que também inclui PostgreSQL foi corrigido em `0.28.17`. O npm sugere `0.29.8`; avaliar atualização e compatibilidade antes de aceitar a mudança. [GHSA-pv5w-4p9q-p3v2](https://github.com/advisories/GHSA-pv5w-4p9q-p3v2), [release 0.28.17](https://github.com/kysely-org/kysely/releases/tag/v0.28.17). |
| `zod@3.25.76` | Produção / alta | O advisory descreve consumo de memória ao validar arrays excessivos sem limite. O código atual valida somente configuração de ambiente; não há schema de payload público nem arrays Zod. O risco aumenta quando cadastro e endpoints de usuário forem introduzidos. | O advisory marca versões abaixo de `4.6.6`; a sugestão do audit é `4.6.7`. É uma atualização major e deve ser testada antes da autenticação. [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Zod 4.6.7](https://github.com/colinhacks/zod/releases/tag/v4.6.7). |
| `vitest@3.2.7`, `@vitest/mocker@3.2.7`, `tinypool@1.1.1` | Desenvolvimento e CI / críticas e moderadas | A cadeia inclui advisories de RCE condicionados a prototype pollution e problemas do mocker no servidor de desenvolvimento. O projeto usa o runner Vitest padrão; não configura Browser Mode nem registra `mockerPlugin`/`interceptorPlugin`. O risco relevante é executar testes em máquina ou CI com código não confiável e uma fonte de prototype pollution. | Tinypool está corrigido a partir de `2.1.2`; os avisos do mocker têm correção em Vitest `4.1.12`. O npm sugere Vitest `5.0.5`. Selecionar uma cadeia compatível, conferir a versão efetiva de Tinypool e executar a suíte antes de atualizar. [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [GHSA-qxg6-89mg-rqv8](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8). |
| `minimatch@10.2.6` e `minimatch@3.1.5` | Desenvolvimento / moderada | A cópia `10.2.6` está no intervalo reportado. O advisory também sinaliza `3.1.5`, mas descreve um mecanismo baseado em `optimizationLevel`, adicionado nas versões 7.x; essa cópia antiga parece falso positivo e requer confirmação. ESLint e `typescript-eslint` aparecem no relatório por essa cadeia transitiva. | Atualizar/resolver a cópia moderna e confirmar a aplicabilidade da cópia 3.x; não usar atualizações amplas do ESLint como correção automática. [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), [changelog do minimatch](https://github.com/isaacs/minimatch/blob/main/changelog.md). |

### Recomendações da triagem inicial (substituídas pela execução acima)

- Não executar `npm audit fix` indiscriminadamente: as propostas incluem mudanças
  major e exigem avaliação de compatibilidade.
- Corrigir a cadeia do Vitest/Tinypool e avaliar as atualizações de Kysely e Zod
  antes de introduzir rotas de autenticação, payloads de usuário ou JSONPath dinâmico.
- A atualização de manifestos e lockfile foi autorizada e executada incrementalmente;
  os resultados estão registrados na seção seguinte.
- Não iniciar autenticação nesta etapa.
- A CI atual executa `npm test`, que exclui a integração PostgreSQL; o workflow
  não chama `npm run test:integration`. Isso é uma pendência de CI observada, não
  foi alterada nesta triagem.

### Execução da correção controlada — 2026-11-01

Atualizações efetuadas incrementalmente, sem autenticação, alterações funcionais
ou atualização ampla de dependências:

| Pacote / workspace | Antes | Depois | Resultado |
| --- | --- | --- | --- |
| `vitest` (raiz e `@reset/server`) | 3.2.7 | 4.1.12 | Corrige a cadeia do mocker e mantém compatibilidade com Node `>=22`, inclusive Node 22.0; Vitest 5.0.5 foi descartado por exigir Node `^22.12.0`. |
| `@vitest/mocker` | 3.2.7 | 4.1.12 | Atualizado pela dependência do Vitest. |
| `tinypool` | 1.1.1 | removido da árvore | Vitest 4.1.12 não instala mais a cópia vulnerável; a árvore foi conferida com `npm ls`. |
| `kysely` (`@reset/server`) | 0.27.6 | 0.28.17 | Corrige os três advisories listados; build, typecheck e testes passaram. |
| `zod` (`@reset/server`, `@reset/shared`) | 3.25.76 | 4.6.7 | Migração major concluída; ambos os workspaces compilam e validam seus schemas. |
| `minimatch` sob `@typescript-eslint/typescript-estree` | 10.2.6 | 11.0.1 | Override restrito no manifesto raiz. A cópia 3.1.5 usada por ESLint foi preservada por compatibilidade. |

O workspace `@reset/desktop` não declara diretamente Kysely, Zod ou Vitest; seu
build foi executado para confirmar a integração com `@reset/shared` após Zod 4.

### Verificação após as atualizações

- `npm test`: passou — 8 testes unitários em 2 arquivos, usando diretório
  temporário dentro do workspace devido a restrição de rename no diretório
  temporário externo do sandbox.
- `npm run test:integration`: executado, mas não passou porque não há PostgreSQL
  acessível em `localhost:5432`; o Docker Desktop também não estava ativo. A
  suíte falhou corretamente ao não conseguir conectar. Reexecutar com PostgreSQL
  disponível antes de integrar a alteração.
- `npm run lint`: passou.
- `npm run typecheck`: passou para desktop, servidor e shared.
- `npm run build`: passou para shared, servidor e desktop. O Vite/Rollup emitiu
  avisos de comentários `@__PURE__` em arquivos internos do Zod 4, removidos pelo
  bundler sem impedir o build.
- `npm audit --json`: 10 entradas moderadas, 0 altas, 0 críticas.
- `npm audit --omit=dev --json`: 0 vulnerabilidades de produção.

As 10 entradas moderadas do audit completo são ESLint, typescript-eslint e
dependências transitivas atribuídas à cópia `minimatch@3.1.5`. O advisory
GHSA-g3hv-75wg-m249 declara genericamente versões `<11.0.1`, mas sua descrição
técnica identifica a amplificação em `minimatch@10.2.6` com
`optimizationLevel >= 2`; essa opção surgiu na linha 7.x e não existe em 3.1.5.
A cópia 10.2.6 foi corrigida para 11.0.1; a cópia 3.1.5 permanece como falso
positivo da faixa ampla do audit. Atualizar ESLint para a versão major 10 só
para silenciar esse falso positivo excederia a correção necessária e não foi
feito. Nenhuma vulnerabilidade alta ou crítica permaneceu.

A implementação de autenticação foi autorizada como etapa própria. O bootstrap
do primeiro administrador por CLI única, com senha digitada sem eco e bloqueio
quando já houver administrador, também foi aprovado. O bootstrap foi
implementado nesta etapa; login, cadastro, convites e sessões continuam fora do
escopo.

### Etapa 1.3 — Revalidação da integração PostgreSQL — 2026-11-01

Na primeira tentativa, `npm run test:integration` não alcançou PostgreSQL em
`localhost:5432`. Na repetição, a suíte foi executada contra um container
PostgreSQL 17 descartável: 1 teste passou. A migration e a consulta de
`system_meta` foram validadas. O container foi encerrado sem volume persistente.

O audit foi repetido nesta etapa: `npm audit --json` confirmou 10 entradas
moderadas, sem altas ou críticas, e `npm audit --omit=dev --json` confirmou 0
vulnerabilidades de produção. Permanecem os avisos atribuídos pelo npm à cópia
`minimatch@3.1.5`, classificados como falso positivo conforme a análise técnica
registrada acima. A validação de dependências e a Etapa 1.3 estão concluídas;
nenhuma alteração adicional de dependências foi necessária.

## Etapa 1.4 — Arquitetura e implementação incremental da autenticação

**Estado:** implementação autorizada como etapa própria. Sessões opacas
persistidas no PostgreSQL, persistência entre reinicializações no Windows
Credential Manager e expiração ociosa de 7 dias/absoluta de 30 dias estão
aprovadas. O bootstrap inicial por CLI única, senha sem eco e bloqueio após
existir administrador também está aprovado e implementado. Os detalhes
operacionais listados adiante continuam pendentes para os demais fluxos.

As decisões novas de produto substituem o rascunho anterior deste documento de
cadastro aberto com e-mail e verificação de e-mail. `infodoc.md` permanece
intacto como histórico; para decisões atuais, prevalece `updatedinfodoc.md`.

### Requisito obrigatório de custo zero

Não contratar serviços pagos, não depender de períodos de teste gratuito, não
exigir cartão de crédito, não aceitar cobranças automáticas e não introduzir
dependências externas pagas. Não contratar domínios, serviços de e-mail ou
serviços externos de autenticação, nem usar qualquer recurso com possibilidade
de cobrança. Priorizar recursos gratuitos e sustentáveis. Qualquer exceção deve
ser submetida à aprovação explícita antes da adoção.

### Sessão opaca ou JWT

| Opção | Vantagens | Custos e limitações |
| --- | --- | --- |
| JWT de acesso + refresh token | Verificação local de assinatura e pouca consulta ao banco no caminho de cada requisição. Pode fazer sentido com vários serviços validando o mesmo token. | Revogação imediata requer uma lista de bloqueio/estado adicional ou access tokens curtos com refresh; exige gestão de chaves, rotação e mais regras. JWT assinado não oculta os claims. |
| Sessão opaca persistida no PostgreSQL | Revogação imediata, logout por dispositivo e implementação central simples; o servidor já depende do PostgreSQL e será um backend único para um grupo pequeno. | Consulta ao banco em cada requisição autenticada; exige um índice para localizar a sessão e política de expiração. |

**Decisão aprovada:** usar sessões opacas persistidas no PostgreSQL. Para um
único backend e o uso esperado, a revogação simples é mais valiosa que a
validação stateless. Se a escala ou a arquitetura mudarem, a decisão pode ser
reavaliada.
OWASP recomenda manter o estado da sessão no servidor e dá suporte a guardar um
verificador em vez do segredo bruto; a mesma orientação recomenda renovar o
identificador após autenticação e mudanças de privilégio. [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### Proposta de emissão e transporte

- Gerar um token de sessão aleatório e imprevisível; enviá-lo ao cliente uma
  única vez e armazenar no banco somente seu hash, com índice único. Não incluir
  ID de usuário ou claims no token. O tamanho e o algoritmo de hash propostos
  anteriormente devem ser confirmados no desenho final, sem armazenar o token
  bruto no banco.
- Enviar o segredo em `Authorization: Bearer` por HTTPS. Esse modelo evita que
  o navegador anexe credenciais automaticamente a requisições cross-site, mas
  não protege contra XSS que execute dentro do aplicativo.
- A sessão deve persistir após reiniciar o aplicativo. Guardar o token no
  Windows Credential Manager; não usar `localStorage`, texto claro em arquivos
  de configuração ou logs. A integração deve evitar dependências pagas e
  complexidade desproporcional.
- O backend é autoridade para validar sessão. Renovar o prazo ocioso somente
  após atividade válida; nunca renovar o prazo absoluto. Sessões expiradas
  devem ser rejeitadas e revogadas.
- Logout invalida a sessão no servidor e remove a credencial do Windows
  Credential Manager. O servidor deve rejeitar tokens revogados e impedir seu
  reuso. Alteração ou redefinição de senha invalida todas as sessões anteriores.
- Configurar CORS para as origens exatas do aplicativo e limitar a CSP ao host
  real da API quando ele for definido. A origem remota de produção ainda não foi
  escolhida.

OWASP aponta a complexidade de revogar JWTs e a necessidade de lista de bloqueio
ou mecanismo equivalente quando revogação é requerida. Um JWT assinado é
codificado, não criptografado. [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)

### Modelo de dados a revisar antes de implementar

- `users`: identificador, nome de usuário ASCII de 3 a 32 caracteres (`A-Z`,
  `a-z`, dígitos, `.`, `_` e `-`), único sem diferenciar maiúsculas,
  `password_hash`, estado da conta e timestamps. Não exigir e-mail nem guardar
  `email_verified_at` para permitir cadastro.
- `sessions`: usuário, hash do segredo, criação, última atividade, expiração,
  revogação e metadados mínimos do dispositivo. Não armazenar nem registrar o
  token bruto. Aplicar 7 dias de inatividade renováveis por atividade válida e
  30 dias de prazo absoluto sem renovação.
- Convites de cadastro e de grupo têm mecanismos e autorizações separados. A
  implementação deve mantê-los independentes; não compartilhar o mesmo convite
  nem a autorização entre os dois fluxos.
- Registro da senha temporária administrativa: hash, validade, uso único e
  estado que obrigue a troca no primeiro acesso. O prazo exato permanece
  pendente.

### Fluxos e controles aprovados para orientar a futura implementação

1. **Criação de conta:** somente administradores geram convites de cadastro.
   Exigir token criptograficamente aleatório e autorização confirmada pelo
   backend antes de criar conta; armazenar somente o hash. Validar expiração,
   revogação e limite de usos, consumindo cada uso atomicamente. A interface
   nunca decide se o cadastro está autorizado. Permanecem pendentes prazo,
   limite numérico de usos, autoridade/condições de revogação e distribuição.
2. **Login:** usar exclusivamente nome de usuário e senha; aplicar limitação de
   tentativas e respostas que evitem enumeração de contas. Não oferecer Google,
   OAuth ou provedor externo de identidade.
3. **Senha:** armazenar somente hash Argon2id, nunca senha em texto puro.
   Padrão oficial aprovado: 19 MiB, 2 iterações, paralelismo 1, hash PHC com
   salt aleatório individual de 16 bytes. Senha deve ter ao menos 12 pontos de
   código e no máximo 1024 bytes UTF-8; validação precede o hash. Limitar Argon2
   a 2 trabalhos simultâneos e 4 em fila. Depois de uma verificação bem-sucedida,
   detectar parâmetros antigos e preparar um hash substituto para persistência.
   [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
4. **Sessão:** emitir token aleatório e imprevisível, guardar o hash no banco e
   guardar o token no Windows Credential Manager para persistir entre
   reinicializações. Aplicar 7 dias de inatividade renováveis por atividade
   válida e 30 dias absolutos não renováveis. Backend valida, rejeita e revoga
   sessões expiradas. Logout invalida no servidor e remove a credencial local.
   Não aceitar reutilização de tokens revogados nem registrar segredos.
5. **Redefinição administrativa:** somente administradores iniciam. Gerar senha
   temporária criptograficamente aleatória, guardar somente seu hash, limitar a
   validade e permitir um uso. No primeiro acesso, obrigar a definir nova senha;
   não permitir reutilizar a temporária. Invalidar todas as sessões anteriores
   e auditar a ação sem registrar senha ou credenciais sensíveis. O prazo exato
   e como o administrador comprova autorização ainda aguardam decisão.
6. **Convites de grupo:** membros com autorização adequada podem gerar convites;
   o backend verifica essa permissão. Validar tokens criptograficamente
   aleatórios e guardar somente seus hashes; aplicar expiração, revogação,
   limite de usos e consumo atômico. O backend valida o token e as regras de
   autorização para ingresso. A aceitação autoriza ingresso no grupo, mas não
   concede privilégios administrativos.

### Decisões ainda pendentes para aprovação

- Prazo exato da senha temporária administrativa e como o administrador
  comprova autorização para iniciar a redefinição.
- Prazo de validade, limite numérico de usos, quem pode revogar e em quais
  condições, e regras práticas de distribuição dos convites de cadastro.
### Bootstrap CLI do primeiro administrador

O comando `npm run bootstrap:admin` cria o primeiro administrador após as
migrations. Para produção compilada, usar `npm run bootstrap:admin:prod` no
ambiente com `DATABASE_URL` configurada. O CLI exige terminal interativo, lê a
senha e sua confirmação sem eco, limita a três tentativas e não imprime senha,
hash ou erros SQL. Ele bloqueia se já houver administrador.

A criação ocorre em uma transação PostgreSQL protegida por advisory lock; um
índice único parcial também limita a tabela a um administrador. O lock cobre a
verificação e o hash para que processos concorrentes não gastem Argon2 em
paralelo nem criem administradores duplicados. Falha ou cancelamento causa
rollback.

Migration `002_users` cria a tabela mínima `users` e eleva `schema_version` a
`1.1.0`. O hash é validado para conter formato PHC Argon2id. A biblioteca
`argon2@0.45.1` foi testada no Node 26.12.1/Windows.

Validação desta etapa: `npm test` (16 testes), `npm run test:integration` contra
PostgreSQL 17 (8 testes), `npm run lint`, `npm run typecheck` e `npm run build`
passaram. O teste do CLI compilado sem terminal terminou com erro seguro e
deixou zero usuários. `npm audit --json` reportou 10 moderadas de desenvolvimento
associadas ao Minimatch 3.x, sem altas/críticas; `npm audit --omit=dev --json`
reportou zero. O container PostgreSQL de teste foi encerrado sem volume.

O bootstrap é o único fluxo de autenticação implementado nesta etapa. Não
implementar login, cadastro, convites ou gerenciamento de sessão antes das
decisões operacionais correspondentes. Não adicionar serviço de e-mail,
provedor de identidade ou serviço pago; qualquer exceção ao custo zero requer
aprovação explícita.

## 6. Medições de Referência (Sprint 0)

Medições realizadas no ambiente local de desenvolvimento (Windows 11, Intel Xeon E5-2650 v2, 16 GB RAM):

| Métrica                           | Meta do infodoc | Resultado Real |
| --------------------------------- | --------------- | -------------- |
| Latência `/health/live` (p95)     | < 200 ms        | **1.82 ms**    |
| Latência `/health/live` (média)   | —               | **18.85 ms**   |
| Memória em repouso (Desktop)      | < 250 MB        | **24.44 MB**   |
| Memória em repouso (Backend)      | < 250 MB        | **72.8 MB**    |
| Tempo de build do Frontend (Vite) | —               | **2.16 s**     |
| Tempo de compilação Tauri (Dev)   | —               | **2m 40s**     |
