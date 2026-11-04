# ResET
## Atualização do planejamento e progresso do projeto

**Documento de continuidade para a IA de desenvolvimento**

**Data:** 01/11/2026  
**Projeto:** ResET  
**Ambiente:** Windows 11, desenvolvimento local em `C:\Projetos\ResET`

---

# 1. Objetivo deste documento

Este documento atualiza o planejamento do ResET com as decisões mais recentes sobre o funcionamento privado do aplicativo e registra o estado atual do desenvolvimento.

Ele deve ser utilizado como referência para dar continuidade ao projeto sem perder decisões anteriores, repetir etapas concluídas ou implementar funcionalidades fora do escopo.

A IA deve considerar este documento em conjunto com o documento mestre de arquitetura já existente no projeto.

Este é o planejamento de produto e progresso vigente. `infodoc.md` permanece
preservado como documento mestre e histórico arquitetural; `docs/DEVELOPMENT.md`
registra o estado técnico detalhado e os resultados de execução.

# 2. Definição atual do produto

O ResET é um aplicativo desktop de comunicação para um círculo privado de amigos.

Seu objetivo é oferecer uma experiência simples e agradável de comunicação, com:

- Conversas em grupo por texto.
- Salas persistentes de voz.
- Chamadas de voz e vídeo.
- Compartilhamento de tela.
- Gerenciamento de grupos e participantes.
- Futuramente, funcionalidades adicionais de entretenimento.

O aplicativo será desenvolvido inicialmente para Windows.

**Não estamos construindo uma plataforma pública ou um serviço comercial de comunicação.**

O público esperado é pequeno, inicialmente entre 4 e 8 participantes em chamadas.

A prioridade é oferecer estabilidade, desempenho, segurança adequada e baixo custo de manutenção.

### Decisões oficiais atuais de acesso e autenticação

| Área | Decisão |
|---|---|
| Criação de contas | Exclusivamente por convite de cadastro validado pelo backend; não há cadastro público. |
| Acesso aos grupos | Privado: a conta não concede participação em grupo. O ingresso exige um link de convite válido e aceitação confirmada pelo backend. |
| Convites de cadastro | Gerados somente por administradores; token aleatório, somente hash armazenado, expiração, revogação, limite de usos e consumo atômico validados pelo backend. |
| Convites de grupo | Gerados por membros autorizados; tokens criptograficamente aleatórios, somente hash armazenado, expiração, revogação, limite de utilizações e validação atômica no backend. Não concedem privilégios administrativos. |
| Autenticação | Somente nome de usuário e senha; sem Google, OAuth ou provedor externo de identidade. |
| Senhas | Hash Argon2id; nunca armazenar senha em texto puro. |
| Sessões | Sessões opacas no PostgreSQL, persistentes entre reinicializações, com token no Windows Credential Manager e revogação pelo servidor. Inatividade: 7 dias renováveis por atividade válida; duração absoluta: 30 dias sem renovação. |
| Redefinição de senha | Somente administradores podem iniciar; senha temporária aleatória, de uso único e validade limitada, armazenada como hash; primeiro uso exige nova senha e invalida sessões existentes. |
| E-mail de autenticação | Sem dependência de envio de e-mail, sem requisito de verificação para criar conta e sem necessidade de domínio próprio. |
| Custo | Custo zero obrigatório. Serviços pagos, períodos de teste, cartão e cobranças automáticas exigem exceção aprovada antes de adoção. |
| Escala e arquitetura | Aplicativo para um pequeno grupo de amigos; manter a solução proporcional e evitar complexidade empresarial sem necessidade concreta. |

# 3. Nova decisão: modelo de acesso

As decisões desta seção foram atualizadas em 01/11/2026. Elas substituem a
decisão anterior de cadastro aberto e os rascunhos de autenticação por e-mail
registrados nas versões anteriores deste documento. O conteúdo correspondente
em `infodoc.md` é mantido intacto como histórico e não representa a decisão
vigente. `updatedinfodoc.md` é a fonte atual das decisões do produto.

## 3.1 Cadastro exclusivamente por convite

Somente pessoas autorizadas por um convite de cadastro poderão criar uma conta.
Não haverá cadastro público.

Antes de criar a conta, o backend deverá validar que o convite autoriza aquele
cadastro. A interface não é autoridade para liberar a operação.

Somente administradores podem gerar convites de cadastro. Os tokens devem ser
criptograficamente aleatórios; armazenar apenas seus hashes. O backend valida
convites, expiração, revogação e limite de utilizações, consumindo cada uso de
forma atômica antes da criação de conta. Não há cadastro público.

O prazo exato de validade, o limite numérico de usos, quem pode revogar e em
quais condições, e as regras práticas de distribuição ainda precisam ser
definidos. Os convites de cadastro permanecem independentes dos convites de
grupo.

## 3.2 Autenticação por nome de usuário e senha

- A autenticação utilizará exclusivamente nome de usuário e senha.
- Nome de usuário ASCII de 3 a 32 caracteres (letras, números, `.`, `_` e
  `-`), único sem diferenciar maiúsculas e minúsculas.
- Google, OAuth de terceiros e provedores externos de identidade estão fora do
  escopo.
- As senhas serão armazenadas usando hash Argon2id, nunca em texto puro.
- Padrão oficial aprovado: 19 MiB de memória, 2 iterações, paralelismo 1,
  saída PHC com salt aleatório individual de 16 bytes. Aceitar senhas de 12 ou
  mais pontos de código e até 1024 bytes UTF-8. Limitar o processamento a dois
  hashes/verificações concorrentes e quatro operações em fila. Após verificação
  bem-sucedida, preparar rehash quando os parâmetros armazenados forem antigos.
- Não exigir endereço de e-mail nem verificação de e-mail para criar uma conta.
- O ResET não dependerá de serviço externo de e-mail para autenticação; Brevo
  e outros provedores de e-mail não fazem parte da solução aprovada.
- Somente administradores poderão iniciar redefinição de senha; o fluxo e a
  senha temporária estão especificados na seção 3.5.

## 3.3 Participação nos grupos por convite

Os grupos são privados e a criação de conta não concede participação em grupo.

Para participar de um grupo, o usuário deverá receber um link de convite.

Fluxo esperado:

1. Um membro com autorização adequada gera o convite; o backend verifica essa
   permissão.
2. O aplicativo disponibiliza um link compartilhável.
3. O amigo recebe e abre o link.
4. A pessoa deve primeiro possuir uma conta criada com convite de cadastro
   válido.
5. Após autenticar-se, poderá aceitar o convite de grupo.
6. O backend valida o convite de grupo e adiciona a conta existente ao grupo.
7. O usuário passa a visualizar os canais e participar das conversas.

O link não deve permitir acesso irrestrito ao grupo. Ele apenas autoriza a tentativa de ingresso, mediante validação no servidor.

## 3.4 Requisitos de segurança dos convites de grupo

Planejar uma implementação com:

- Tokens aleatórios criptograficamente seguros.
- Armazenamento apenas do hash do token no banco.
- Data de expiração configurável.
- Possibilidade de revogação.
- Limite de utilizações configurável.
- Validação de utilização no backend.
- Proteção contra reutilização acima do limite.
- Operação atômica para impedir que vários usuários ultrapassem o limite simultaneamente.
- Respostas que não exponham informações desnecessárias sobre grupos ou convites.

O link não deve conter dados sensíveis do grupo.

A entrada no grupo depende da validade do token e das regras de autorização
aplicáveis ao grupo; tudo deve ser validado pelo backend, nunca apenas pelo
frontend. O backend também valida as permissões de quem gera o convite. A
aceitação de um convite de grupo não concede privilégios administrativos.

A interface poderá permitir que membros autorizados criem, copiem, revoguem e
consultem convites ativos; o backend deve verificar a permissão em cada
operação.

**Importante:** os requisitos acima são orientações para o planejamento e implementação. Não considerar essa funcionalidade já desenvolvida.

Convites de cadastro e convites de grupo têm finalidades diferentes. O primeiro
autoriza a criação de conta; o segundo autoriza uma conta existente a entrar em
um grupo privado. Os mecanismos devem permanecer independentes e não podem
compartilhar a mesma autorização ou convite.

## 3.5 Redefinição administrativa de senha

- Somente administradores podem iniciar a redefinição.
- O sistema gera senha temporária criptograficamente aleatória, com validade
  limitada e uso único. O prazo exato permanece pendente de aprovação.
- Armazenar somente hash seguro da senha temporária; nunca registrar senha ou
  credenciais sensíveis.
- No primeiro acesso, exigir que o usuário defina uma nova senha. A temporária
  não pode ser reutilizada.
- Invalidar todas as sessões anteriores após a redefinição.
- Auditar a operação e o administrador executor sem incluir senhas ou outros
  segredos no registro.
- O método pelo qual o administrador comprova a autorização para redefinir
  senha ainda é uma pendência arquitetural.

# 4. Filosofia de desenvolvimento atualizada

O ResET deve ser desenvolvido com segurança proporcional ao seu cenário de uso.

Não precisamos de uma arquitetura empresarial ou preparada para milhares de usuários.

Evitar:
- Microserviços desnecessários.
- Kubernetes.
- Redis sem necessidade comprovada.
- Sistemas complexos de distribuição.
- Infraestrutura cara.
- Abstrações excessivas.
- Dependências desnecessárias.

Priorizar:
- Monólito modular.
- Código legível e organizado.
- Banco de dados PostgreSQL.
- Segurança nas operações de autenticação e autorização.
- Comunicação em tempo real estável.
- Baixo consumo de recursos.
- Facilidade de manutenção.
- Testes relevantes.
- Baixo custo de hospedagem.

A aplicação deve continuar preparada para evoluir, mas sem antecipar problemas que ainda não existem.

### Requisito obrigatório de custo zero

O custo zero é uma condição do projeto. Não contratar serviços pagos, depender
de períodos de teste gratuito, exigir cartão de crédito, permitir cobranças
automáticas ou introduzir dependências externas pagas. Não contratar domínios,
serviços de e-mail ou serviços externos de autenticação, nem usar recursos que
possam gerar cobrança. Priorizar opções gratuitas e sustentáveis. Qualquer
exceção deve ser apresentada e aprovada explicitamente antes da adoção.

# 5. Stack tecnológica definida

As tecnologias principais continuam as mesmas:

| Camada | Tecnologia |
|---|---|
| Desktop | Tauri 2 |
| Interface | React 19 |
| Linguagem frontend | TypeScript |
| Build frontend | Vite |
| Backend | Node.js LTS + Fastify |
| Linguagem backend | TypeScript |
| Validação | Zod |
| Banco de dados | PostgreSQL 17 |
| Acesso ao banco | Kysely + pg |
| Comunicação HTTP | REST |
| Comunicação em tempo real | Socket.IO |
| Áudio e vídeo | LiveKit |
| Infraestrutura | Docker Compose |
| Proxy reverso | Caddy |
| Testes | Vitest + Playwright |
| Gerenciamento | npm Workspaces |

Não alterar a stack sem justificativa técnica concreta e aprovação.

# 6. Estado atual do desenvolvimento

## Sprint 0: Fundação arquitetural

<status>Concluída</status>

A fundação inicial do monorepositório foi implementada.

Principais entregas:

- Diagnóstico do ambiente de desenvolvimento.
- Monorepositório com npm Workspaces.
- Configuração base de TypeScript.
- ESLint e Prettier.
- Pacote compartilhado `@reset/shared`.
- Backend Fastify.
- Integração inicial com PostgreSQL.
- Kysely e sistema de migrations.
- Endpoints `/health/live` e `/health/ready`.
- Testes com Vitest.
- Aplicação desktop com Tauri 2.
- React 19 e Vite.
- Tokens visuais iniciais.
- Docker Compose com PostgreSQL 17.
- Dockerfile do backend.
- Pipeline inicial de CI no GitHub Actions.
- README e documentação de desenvolvimento.

Também foi realizada uma compilação nativa de prova do Tauri 2 no Windows.

O ambiente conseguiu compilar e vincular o executável utilizando MSVC, Windows SDK e WebView2.

## Etapa 1.1: Saneamento técnico

<status>Concluída segundo o relatório da IA</status>

Foram realizados ajustes importantes antes da implementação da autenticação:

- Tratamento centralizado de erros do Fastify.
- Respostas padronizadas de erro e 404.
- Proteção contra exposição de detalhes internos.
- Encerramento controlado do servidor e do PostgreSQL.
- Timeout de encerramento de até 10 segundos.
- Execução explícita de migrations durante deploy.
- Remoção de senhas padrão do Docker Compose.
- Correção da resolução de pacotes no container.
- Correção de caminhos de migrations no Windows.
- Restrição inicial da CSP do Tauri.
- Remoção da URL fixa da API no frontend.
- Testes de integração configurados para falhar caso o PostgreSQL não esteja disponível.
- Inclusão do `Cargo.lock` no Git.
- Atualização da documentação.

Segundo o relatório recebido, foram verificados:

- Build do monorepositório.
- Build do Tauri.
- Geração dos instaladores MSI e NSIS.
- Testes unitários.
- Testes de integração com PostgreSQL real.
- Typecheck.
- Build do container de produção.
- Execução de migration no ambiente de produção.
- Healthcheck do container.

**Atenção:** os resultados acima foram informados pela IA de desenvolvimento. Não devem ser tratados como auditoria independente.

# 7. Triagem de vulnerabilidades de dependências

A triagem inicial abaixo foi seguida pela etapa autorizada de correção
controlada, concluída em 01/11/2026. Os números iniciais permanecem como
histórico; o resultado final e as versões estão registrados mais adiante nesta
seção e em `docs/DEVELOPMENT.md`.

Durante a instalação com `npm ci`, foram reportadas:

- 2 vulnerabilidades altas em dependências de produção.
- 16 vulnerabilidades no conjunto completo de dependências.
- 2 vulnerabilidades críticas no conjunto completo.

Em 01/11/2026, a triagem read-only foi executada com `npm audit --json` e
`npm audit --omit=dev --json`:

- Conjunto completo: 16 entradas — 12 moderadas, 2 altas e 2 críticas.
- Produção: 2 entradas altas (`kysely@0.27.6` e `zod@3.25.76`); sem entradas críticas.
- A cadeia de desenvolvimento inclui `vitest@3.2.7`, `@vitest/mocker@3.2.7`
  e `tinypool@1.1.1`. O risco crítico depende de condições de execução de código
  não confiável e/ou prototype pollution; não é dependência de runtime de produção.
- O código atual não usa JSONPath dinâmico do Kysely nem schemas de arrays Zod
  para entradas de usuários. Essa ausência reduz a exploração direta atual, mas
  não elimina a necessidade de decidir correções antes de expor autenticação.
- `npm audit` propõe mudanças major para algumas correções. Não aplicar
  atualizações em massa; revisar compatibilidade e aprovar cada alteração.

Nenhuma dependência foi alterada durante a triagem read-only. A etapa autorizada
de correção veio depois e está registrada abaixo. O relatório detalhado, os
caminhos e a aplicabilidade estão em `docs/DEVELOPMENT.md`.

## Resultado da correção controlada — 01/11/2026

As atualizações foram aplicadas incrementalmente, na ordem autorizada, sem
implementar autenticação nem alterar funcionalidades:

| Pacote / workspace | Antes | Depois |
|---|---:|---:|
| `vitest` (raiz e `@reset/server`) | 3.2.7 | 4.1.12 |
| `@vitest/mocker` | 3.2.7 | 4.1.12 |
| `tinypool` | 1.1.1 | removido da árvore instalada |
| `kysely` (`@reset/server`) | 0.27.6 | 0.28.17 |
| `zod` (`@reset/server`, `@reset/shared`) | 3.25.76 | 4.6.7 |
| `minimatch` sob `@typescript-eslint/typescript-estree` | 10.2.6 | 11.0.1, por override restrito |
| `minimatch` usado pela cadeia ESLint | 3.1.5 | 3.1.5, preservado |

Verificações: `npm test` passou (8 testes); lint, typecheck de todos os
workspaces e build completo passaram. O build Vite mostrou somente avisos de
comentários internos `@__PURE__` do Zod removidos pelo bundler. O teste de
integração foi executado, mas não conectou porque não havia PostgreSQL em
`localhost:5432` nem Docker Desktop ativo; precisa ser repetido com PostgreSQL
disponível.

Resultado final do audit: 10 entradas moderadas no conjunto completo, sem
entradas altas ou críticas; dependências de produção sem vulnerabilidades.
As entradas restantes pertencem à cadeia ESLint atribuída pelo audit à cópia
`minimatch@3.1.5`. O advisory declara genericamente versões `<11.0.1`, mas descreve
a amplificação em `10.2.6` com `optimizationLevel >= 2`, opção que não existe na
versão 3.1.5. A cópia 10.2.6 foi substituída por 11.0.1. As ocorrências de
3.1.5 são consideradas falso positivo por faixa ampla; não se atualizou ESLint
para major 10 apenas para silenciar o audit. Detalhes completos e comandos em
`docs/DEVELOPMENT.md`.

A etapa de correção controlada e a revalidação PostgreSQL da Etapa 1.3 estão
concluídas. A autenticação está autorizada como etapa própria e deve avançar
incrementalmente, fechando as decisões pendentes antes dos fluxos afetados.

## Etapa 1.3 — Validação final das dependências

O audit final foi repetido nesta etapa: `npm audit --json` confirmou 10
entradas moderadas, sem alertas altos ou críticos, e
`npm audit --omit=dev --json` confirmou 0 vulnerabilidades de produção. As
entradas residuais atribuídas a Minimatch 3.1.5 estão classificadas como falso
positivo com justificativa técnica na seção anterior.

O teste `npm run test:integration` foi repetido em 01/11/2026. A primeira
tentativa não alcançou PostgreSQL, mas a repetição contra um container
PostgreSQL 17 descartável passou (1 teste). A migration e consulta de
`system_meta` foram verificadas. O container foi encerrado sem volume
persistente. A validação de integração e o audit final da Etapa 1.3 estão
concluídos.

## Etapa 1.4 — Planejamento e implementação incremental da autenticação

**Estado:** implementação autorizada como etapa própria. O bootstrap do
primeiro administrador por CLI única, com senha digitada sem eco e bloqueio
quando já houver administrador, foi implementado. Os demais fluxos aguardam as
decisões operacionais que os afetam.

Decisões definidas: expiração ociosa e absoluta da sessão, persistência no
Windows Credential Manager, senha temporária administrativa de uso único,
regras centrais dos convites de cadastro e de grupo, regra de nome de usuário e
perfil Argon2id.

Pendências antes de implementar:

1. Prazo exato de validade da senha temporária.
2. Como o administrador comprova autorização para iniciar a redefinição.
3. Prazo de validade, limite numérico de utilizações, autoridade/condições de
   revogação e regras práticas de distribuição dos convites de cadastro.
O bootstrap CLI foi validado com testes unitários e integração PostgreSQL. A
execução requer migrations prévias: `npm run migrate` e `npm run bootstrap:admin`;
em produção compilada: `npm run migrate:prod` e
`npm run bootstrap:admin:prod`. O CLI usa uma transação com advisory lock e
índice único parcial para impedir inicializações concorrentes duplicadas.
Executa hash PHC Argon2id com o perfil oficial aprovado. Não implementa login,
cadastro, convites ou sessões.

Validação: 16 testes unitários passaram; 8 testes de integração passaram contra
PostgreSQL 17; lint, typecheck, build do monorepo e build da imagem de produção
passaram. O módulo Argon2id também executou hash dentro da imagem Alpine. O
comando compilado foi executado sem TTY e recusou a operação sem criar usuários.
`npm audit` reportou 10 vulnerabilidades moderadas de desenvolvimento já
registradas na Etapa 1.2, sem altas/críticas; `npm audit --omit=dev` reportou 0.
O container e a imagem descartáveis de validação foram removidos.

Pendências operacionais restantes são prazo da senha temporária, prova da
autorização administrativa e validade, quantidade, revogação e distribuição dos
convites de cadastro. Não decidir esses pontos automaticamente.

# 8. Próxima fase: autenticação e gerenciamento de usuários

A próxima fase funcional deverá implementar contas criadas exclusivamente por
convite de cadastro e autenticadas por nome de usuário e senha. A implementação
foi autorizada como etapa própria; avançar incrementalmente e obter as decisões
operacionais necessárias antes dos fluxos que dependem delas.

Os grupos permanecem privados e utilizam convites de grupo separados dos
convites de cadastro.

Funcionalidades previstas:

### Contas
- Criação de conta somente após validação de convite de cadastro no backend.
- Nome de usuário e senha; sem Google, OAuth ou provedor de identidade externo.
- Login.
- Logout.
- Redefinição de senha administrativa, conforme fluxo ainda pendente.
- Perfil básico.
- Alteração de senha.
- Gerenciamento de sessões.

### Segurança
- Hash de senha com Argon2id no perfil que será fixado após a aprovação do
  benchmark local registrado na Etapa 1.4.
- Tokens de sessão aleatórios e imprevisíveis; armazenar somente hash no banco.
- Persistência de sessão entre reinicializações, guardando o token no Windows Credential Manager.
- Revogação no servidor e rejeição permanente de tokens revogados.
- Invalidar sessões após redefinição ou alteração de senha.
- Proteção contra brute force.
- Rate limiting proporcional.
- Validação de dados com Zod.
- Autorização sempre realizada no backend.
- Proteção contra enumeração de usuários.
- Nunca registrar senhas ou tokens sensíveis nos logs.

### Banco de dados

Avaliar as tabelas:

- `users`
- `profiles`
- `sessions`
- Registros de convites de cadastro.
- Registros de convites de grupo, sem presumir que usem o mesmo mecanismo.
- Estrutura para redefinição administrativa, após fechar o prazo da senha
  temporária e a comprovação de autorização do administrador.

Os nomes e a estrutura definitiva deverão ser revisados antes da implementação.

## Direção de autenticação aprovada; detalhes pendentes

A direção aprovada é usar sessões opacas persistidas no PostgreSQL, enviadas ao
servidor como credencial Bearer por HTTPS e mantidas entre reinicializações do
aplicativo. O token deverá ser guardado no Windows Credential Manager e poderá
ser revogado pelo servidor. Essa solução é proporcional ao backend único e ao
grupo pequeno.

O prazo de inatividade aprovado é de 7 dias e deve ser renovado somente após
atividade válida do usuário. O prazo absoluto aprovado é de 30 dias e não se
renova com atividade. O backend é autoridade para verificar a sessão; ao expirar,
deve rejeitá-la e revogá-la. Logout invalida a sessão no servidor e remove a
credencial local. Enquanto válida, a sessão mantém o usuário autenticado após
reiniciar o aplicativo.

A implementação foi autorizada como etapa própria. Permanecem pendentes:

- Prazo exato de validade da senha temporária de redefinição.
- Como o administrador comprovará autorização para iniciar redefinição de senha.
- Prazo de validade, limite numérico de usos, autoridade e condições para
  revogar, e regras práticas de distribuição dos convites de cadastro.

Não tomar decisões automaticamente para preencher esses detalhes; fechá-los
antes dos fluxos correspondentes. A implementação autorizada deve respeitar o
custo zero; não adicionar fluxo ou dependência de e-mail.

# 9. Planejamento das próximas fases

A ordem geral do projeto permanece:

| Fase | Objetivo | Situação |
|---|---|---|
| Sprint 0 | Fundação arquitetural | Concluída |
| Etapa 1.1 | Saneamento técnico | Concluída |
| Etapa 1.2 | Correção controlada de dependências | Concluída; 10 avisos moderados residuais classificados como falso positivo do Minimatch 3.x |
| Etapa 1.3 | Revalidação das dependências com PostgreSQL | Concluída; integração com PostgreSQL 17 e audit final registrados |
| Etapa 1.4 | Detalhes operacionais da autenticação | Bootstrap CLI implementado e validado; pendem detalhes de convites, senha temporária e autorização administrativa |
| Fase 1 | Autenticação e usuários | Em andamento; bootstrap inicial concluído; demais fluxos dependem de decisões operacionais |
| Fase 2 | Grupos, membros e convites | Pendente |
| Fase 3 | Conversas por texto | Pendente |
| Fase 4 | Voz, vídeo e compartilhamento de tela | Pendente |
| Fase 5 | Refinamento visual e experiência | Pendente |
| Fase 6 | Funcionalidades extras | Futura |
| Fase 7 | Hospedagem e produção | Futura |

A ordem poderá ser refinada conforme dependências técnicas, mas não devemos começar várias fases simultaneamente sem necessidade.

# 10. Diretrizes obrigatórias para a IA de desenvolvimento

A IA deverá:

1. Ler a documentação existente antes de modificar arquivos.
2. Conferir o estado real do Git e do projeto.
3. Não presumir que o relatório anterior representa o estado atual do código.
4. Trabalhar somente na etapa autorizada.
5. Não implementar funcionalidades futuras antecipadamente.
6. Preservar funcionalidades existentes.
7. Evitar dependências desnecessárias.
8. Implementar validação e tratamento de erros.
9. Criar testes relevantes para cada funcionalidade.
10. Verificar build, lint e typecheck.
11. Não declarar testes como aprovados sem executá-los.
12. Não ocultar falhas ou testes ignorados.
13. Documentar decisões técnicas relevantes.
14. Não realizar commits ou alterações remotas sem autorização.
15. Apresentar um relatório de conclusão ao final de cada etapa.

Antes de implementar qualquer funcionalidade importante, apresentar a proposta técnica e suas consequências.

# 11. Instruções para a próxima execução

Implementar a autenticação somente dentro da etapa própria autorizada e em
sequência incremental. Não avançar nos fluxos que dependem de decisões ainda
pendentes sem receber essas definições.

O diagnóstico, a correção de dependências, o audit final e a integração
PostgreSQL já foram registrados. A implementação de autenticação foi autorizada
como etapa própria. O bootstrap CLI e a regra de nome de usuário foram
implementados/aprovados; prazo da senha temporária, prova de autorização
administrativa e limites/distribuição dos convites de cadastro ainda aguardam
definição.

Sequência de trabalho autorizada:

- Fechar as decisões operacionais pendentes antes de implementar seus fluxos.
- Prosseguir incrementalmente com bootstrap, convites, contas, sessões e
  redefinição administrativa, executando testes de segurança e integração
  PostgreSQL em cada etapa.
- Não introduzir envio de e-mail ou provedor externo de identidade; qualquer
  exceção ao custo zero exige aprovação explícita.

O bootstrap CLI está implementado. Os demais fluxos devem aguardar as decisões
operacionais que os afetam. Qualquer implementação deve aceitar criação de conta somente
por convite de cadastro validado no backend, usar nome de usuário e senha, manter
os grupos privados por convites próprios e respeitar o requisito de custo zero.

# 12. Premissa definitiva do produto

O ResET é um aplicativo privado de comunicação para amigos.

O cadastro é exclusivamente por convite validado pelo backend. Os grupos são
privados e contas existentes só podem ingressar mediante convite de grupo
válido; convites de cadastro e de grupo têm finalidades distintas.

O projeto deve ser simples, seguro, econômico e confiável.

Não devemos transformar um aplicativo para um pequeno grupo de amigos em uma infraestrutura desnecessariamente complexa.

**A prioridade é fazer o aplicativo funcionar muito bem para quem realmente vai utilizá-lo.**
