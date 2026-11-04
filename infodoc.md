# ResET

## Documento Mestre de Transferência e Desenvolvimento

**Versão:** 2.0  
**Status:** Planejamento concluído, preparação do ambiente concluída, Sprint 0 pendente de execução.  
**Objetivo:** Dar continuidade ao planejamento e desenvolvimento do ResET diretamente no ambiente local, utilizando Claude no Antigravity como agente de implementação e ChatGPT como apoio de arquitetura, planejamento e revisão.

---

# 1. CONTEXTO DO PROJETO

Estamos desenvolvendo o **ResET**, um aplicativo desktop de comunicação em grupo, inspirado no projeto Chat Friends.

A intenção é reconstruir as funcionalidades principais do projeto original, mas com uma arquitetura mais simples, organizada, leve e sustentável.

Não queremos simplesmente copiar o código original. Queremos construir nossa própria implementação, aproveitando as ideias e funcionalidades que fazem sentido.

O projeto deve ser desenvolvido gradualmente, com uma estrutura que permita adicionar recursos sem transformar o sistema em algo excessivamente complexo.

### Objetivos principais

- Comunicação por texto em grupos.
- Salas permanentes de voz.
- Chamadas de voz e vídeo.
- Compartilhamento de tela.
- Cadastro público de usuários.
- Grupos com membros, convites e permissões.
- Aplicativo desktop para Windows.
- Interface minimalista, escura e rápida.
- Experiência simples para os usuários finais.
- Possibilidade de hospedar o sistema para que amigos possam utilizar sem configurações técnicas complicadas.

**Prioridade absoluta:** desempenho, simplicidade de utilização, segurança e facilidade de manutenção.

# 2. DECISÕES DE PRODUTO JÁ DEFINIDAS

Estas decisões foram discutidas e aprovadas. Não as altere sem apresentar uma justificativa e solicitar aprovação.

| Decisão                 | Escolha                                      |
| ----------------------- | -------------------------------------------- |
| Abordagem               | Clone funcional do Chat Friends              |
| Prioridade              | Simplicidade com possibilidade de expansão   |
| Plataforma              | Desktop                                      |
| Sistema inicial         | Windows                                      |
| Aplicativo              | Tauri                                        |
| Nome                    | ResET                                        |
| Tema                    | Escuro                                       |
| Identidade              | Minimalista                                  |
| Cor de destaque         | Verde                                        |
| Capacidade das chamadas | 4 a 8 participantes                          |
| Cadastro                | Público                                      |
| Conversas               | Apenas grupos inicialmente                   |
| Mensagens privadas      | Fora do escopo inicial                       |
| Salas de voz            | Permanentes                                  |
| Entrada nas salas       | Escolha de microfone e câmera a cada entrada |
| Interface               | Focada nas conversas                         |
| Desempenho              | Prioridade máxima                            |

### Experiência esperada

O usuário deve conseguir:

1. Instalar o aplicativo.
2. Criar uma conta.
3. Entrar em um grupo.
4. Conversar por texto.
5. Entrar em uma sala de voz.
6. Ativar ou desativar câmera e microfone.
7. Compartilhar a tela quando necessário.

A experiência dos amigos que utilizarão o sistema deve ser simples. Não queremos exigir instalação de ferramentas de desenvolvimento, configuração de servidores ou conhecimentos técnicos.

# 3. REFERÊNCIA: CHAT FRIENDS ORIGINAL

Repositório analisado:

https://github.com/dhtNEO/chat-friends

O projeto original utiliza:

- React 19 e TypeScript.
- Java 25 e Spring Boot.
- PostgreSQL 17.
- LiveKit.
- Docker.
- Caddy.

A implementação original possui funcionalidades como autenticação, sessões, MFA, compartilhamento de tela, jogos, calendário e recursos de música.

Não é necessário reproduzir tudo imediatamente.

O foco inicial do ResET é reconstruir a experiência principal de comunicação, deixando funcionalidades adicionais para etapas futuras.

### Aprendizados importantes da análise original

- O LiveKit é utilizado para comunicação de áudio e vídeo.
- A infraestrutura exige atenção especial ao tráfego UDP.
- Túneis HTTP convencionais não substituem a conectividade necessária para mídia via SFU.
- CGNAT pode impedir encaminhamento direto de portas.
- O projeto original possui uma infraestrutura relativamente complexa para o objetivo que queremos atingir.

Não queremos repetir essa complexidade sem necessidade.

# 4. IDENTIDADE VISUAL

A identidade deve ser discreta, moderna e funcional.

Paleta inicial:

| Elemento       | Cor       |
| -------------- | --------- |
| Fundo          | `#101613` |
| Superfícies    | `#1B2820` |
| Destaque       | `#72C88B` |
| Destaque claro | `#B8E7C3` |
| Texto          | `#E6EEE8` |

### Diretrizes

- Interface predominantemente escura.
- Verde utilizado em ações, estados ativos e detalhes importantes.
- Hierarquia visual clara.
- Poucos elementos decorativos.
- Animações discretas e justificadas.
- Sem gradientes roxos genéricos.
- Sem excesso de brilhos, sombras ou efeitos.
- Nada de aparência de template genérico produzido por IA.

A interface deve priorizar a leitura das mensagens e a navegação entre grupos e salas.

# 5. ARQUITETURA E TECNOLOGIAS

A arquitetura aprovada é um **monólito modular**.

Não utilizar microserviços nesta fase.

### Aplicativo desktop

- Tauri 2.
- React.
- TypeScript.
- Vite.

### Backend

- Node.js LTS.
- Fastify.
- Zod para validação.
- REST para operações convencionais.
- Socket.IO para comunicação em tempo real.

### Banco de dados

- PostgreSQL.
- Kysely.
- Driver `pg`.

### Comunicação de áudio e vídeo

- LiveKit.

### Infraestrutura

- Docker Compose.
- Caddy na etapa de produção.
- HTTPS.

### Testes

- Vitest.
- Playwright.
- Testes de integração com PostgreSQL real.

### Gerenciamento

- npm Workspaces.
- Git.

Não introduzir pnpm, Turborepo, Nx ou ferramentas semelhantes sem necessidade demonstrada.

### Decisões arquiteturais adicionais

1. O pacote `packages/shared` será consumido diretamente como TypeScript, sem exigir build separado inicialmente.
2. Os testes unitários e de integração ficarão próximos dos respectivos pacotes.
3. A pasta raiz `tests/` ficará reservada principalmente para testes E2E futuros.
4. O Docker Compose inicial terá apenas banco de dados e servidor.
5. Caddy será introduzido na etapa de produção.
6. LiveKit será introduzido na etapa de comunicação.
7. Redis não será utilizado inicialmente.
8. Kubernetes está fora do escopo.
9. Não implementar infraestrutura de alta disponibilidade prematuramente.

# 6. ESTRUTURA PREVISTA DO REPOSITÓRIO

Estrutura inicial desejada:

```text
reset/
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   └── src-tauri/
│   │
│   └── server/
│       └── src/
│           ├── modules/
│           ├── plugins/
│           ├── websocket/
│           ├── database/
│           └── server.ts
│
├── packages/
│   └── shared/
│       ├── schemas/
│       ├── types/
│       └── constants/
│
├── infrastructure/
│   ├── docker/
│   └── caddy/
│
├── tests/
│
├── docker-compose.yml
├── package.json
└── README.md
```

Essa é uma estrutura de referência. Você pode propor pequenos ajustes fundamentados, mas não deve complicar a arquitetura.

# 7. BANCO DE DADOS

Entidades inicialmente previstas:

- users
- profiles
- sessions
- groups
- group_members
- group_invites
- text_channels
- voice_channels
- messages
- notifications
- user_settings
- moderation_logs

### Diretrizes

- Chaves e relacionamentos bem definidos.
- Índices baseados nas consultas reais.
- Paginação por cursor para mensagens.
- Evitar consultas N+1.
- Consultas SQL explícitas quando necessário.
- Pool de conexões limitado e configurável.
- Migrations versionadas.
- Integridade referencial.
- Evitar carregamento de históricos completos.

Não crie todas as tabelas e regras de negócio na Sprint 0. O banco deve evoluir conforme cada funcionalidade for implementada.

# 8. SEGURANÇA

Segurança deve ser considerada desde a primeira etapa.

Requisitos:

- Senhas armazenadas com Argon2id.
- Cadastro e recuperação de conta seguros.
- Verificação de e-mail.
- Sessões seguras e revogáveis.
- Rate limiting.
- Validação de entradas com Zod.
- Consultas parametrizadas.
- Autorização sempre verificada no backend.
- Proteção contra XSS e CSRF conforme o modelo de autenticação.
- Tokens LiveKit de curta duração e permissões mínimas.
- Segredos fora do repositório.
- Logs sem senhas, tokens ou informações sensíveis.
- Content Security Policy adequada.
- Permissões mínimas no Tauri.
- Atualizações assinadas quando aplicável.

Não confiar exclusivamente nas verificações realizadas pela interface.

# 9. DESEMPENHO

Este projeto precisa ser leve.

O desempenho não pode ser tratado como uma otimização futura. Deve orientar as decisões desde o começo.

### Frontend

- Lazy loading quando justificado.
- Bundles pequenos.
- Virtualização de listas extensas de mensagens.
- Atualizações de estado controladas.
- Evitar renderizações desnecessárias.
- Imagens otimizadas.
- Evitar polling sem necessidade.
- Não executar trabalho pesado na thread principal.

### Backend

- Consultas eficientes.
- Paginação.
- Payloads pequenos.
- Pool de conexões controlado.
- Logs estruturados e de baixo custo.
- Evitar operações bloqueantes.

### Comunicação em tempo real

- Eventos Socket.IO pequenos.
- Reconexão com exponential backoff e jitter.
- Deduplicação de eventos.
- ACK nas operações importantes.
- Presença em memória inicialmente.
- Preparar um caminho de expansão futura sem implementar Redis prematuramente.

### LiveKit

- Qualidade adaptativa.
- Simulcast quando apropriado.
- Evitar transcodificação.
- Limites configuráveis.
- Testar qualidade com 4 e 8 participantes.

### Metas iniciais de desempenho

São objetivos de referência, não resultados já comprovados:

| Métrica                   | Meta                   |
| ------------------------- | ---------------------- |
| Inicialização a frio      | Até 3 segundos         |
| Interface inicial         | Até 2 segundos         |
| API p95                   | Menos de 200 ms        |
| ACK de evento de chat     | Menos de 300 ms        |
| Memória em repouso        | Meta inferior a 250 MB |
| Participantes por chamada | 4 a 8                  |

As medições devem registrar máquina, condições, método e resultado real.

Não inventar resultados nem declarar metas atingidas sem medições.

# 10. PLANO DE DESENVOLVIMENTO

O desenvolvimento será dividido em fases.

## Fase 0: Fundação

Objetivo: construir a estrutura técnica mínima.

- Monorepo.
- npm Workspaces.
- React, TypeScript e Vite.
- Tauri 2.
- Fastify.
- PostgreSQL.
- Kysely.
- Docker Compose.
- Configuração de ambiente.
- Endpoints de saúde.
- Testes iniciais.
- CI.
- Documentação.
- Medições iniciais.

Não implementar autenticação, chat, grupos ou LiveKit nesta fase.

## Fase 1: Autenticação

- Cadastro público.
- Login.
- Logout.
- Verificação de e-mail.
- Recuperação de senha.
- Sessões.
- Perfil do usuário.

## Fase 2: Grupos

- Criar grupos.
- Editar grupos.
- Convites.
- Gerenciamento de membros.
- Cargos.
- Permissões.

## Fase 3: Chat

- Canais de texto.
- Envio e recebimento de mensagens.
- Histórico.
- Edição e exclusão.
- Notificações.
- Presença.
- Reconexão.

## Fase 4: Voz e vídeo

- Integração LiveKit.
- Salas permanentes.
- Seleção de dispositivos.
- Microfone.
- Câmera.
- Compartilhamento de tela.
- Reconexão.
- Limites de participantes.

## Fase 5: Interface final

- Identidade visual ResET.
- Interface definitiva.
- Configurações.
- Seleção de dispositivos.
- Acessibilidade.
- Refinamento de UX.

## Fase 6: Recursos adicionais

- Jogos.
- Música.
- Personalização.
- Outras funcionalidades que façam sentido.

## Fase 7: Produção

- Instalador Windows.
- Assinatura.
- Atualizador.
- Hospedagem.
- HTTPS.
- LiveKit em produção.
- Backups.
- Testes de segurança.
- Testes de desempenho.

# 11. HOSPEDAGEM E DISTRIBUIÇÃO

O objetivo é encontrar uma solução de hospedagem gratuita ou de custo muito baixo.

Oracle Cloud Always Free foi considerada uma possibilidade, mas ainda não foi aprovada como solução definitiva.

Antes de escolher a infraestrutura, verificar:

- Disponibilidade real dos recursos.
- Compatibilidade ARM64 das imagens.
- RAM e CPU disponíveis.
- Conectividade UDP.
- Funcionamento do LiveKit.
- Necessidade de TURN.
- Testes com 4 e 8 participantes.
- Limites de tráfego.
- Custos futuros.
- Confiabilidade.

Um túnel HTTP comum não resolve sozinho o transporte de mídia UDP do LiveKit.

A hospedagem definitiva deve ser decidida após testes práticos.

# 12. HISTÓRICO DA ANÁLISE FEITA COM CLAUDE

Uma análise arquitetural anterior foi realizada pelo Claude no navegador.

Ele aprovou a arquitetura geral e apontou os seguintes pontos de atenção:

1. Definir uma máquina de referência para os benchmarks.
2. Medir inicialização e memória de forma consistente.
3. Avaliar Tauri, CSP e CORS.
4. Verificar a compatibilidade do WebView2 com LiveKit.
5. Escolher armazenamento seguro para sessões.
6. Definir corretamente a estratégia CSRF.
7. Validar compatibilidade do Argon2 nativo.
8. Considerar UUIDv7 para mensagens.
9. Avaliar Socket.IO e seus mecanismos de fallback.
10. Reconhecer que Playwright não testa diretamente todos os aspectos de um aplicativo Tauri.
11. Considerar o custo de assinatura de executáveis Windows.
12. Planejar SMTP e verificação de e-mail.
13. Realizar uma prova técnica de LiveKit antes da Fase 4.
14. Testar Oracle Cloud ARM64 e conectividade UDP.

### Quatro ajustes arquiteturais aprovados

- Testes co-localizados nos pacotes.
- Docker Compose inicial com somente PostgreSQL e servidor.
- `packages/shared` consumido como TypeScript diretamente.
- npm Workspaces sem ferramentas adicionais de orquestração.

# 13. AMBIENTE LOCAL DE DESENVOLVIMENTO

O computador principal de desenvolvimento é Windows 11.

Há também Windows 10 em dual boot, mas o ambiente principal é Windows 11.

### Hardware

| Componente         | Informação            |
| ------------------ | --------------------- |
| Processador        | Intel Xeon E5-2650 v2 |
| Núcleos            | 8                     |
| Threads            | 16                    |
| Memória RAM        | 15,9 GB               |
| SSD                | XrayDisk 240 GB       |
| HD                 | 1 TB                  |
| Espaço livre em C: | Aproximadamente 61 GB |

Essa máquina deve ser considerada a referência inicial para medições locais.

### Ferramentas instaladas

| Ferramenta     | Versão / Estado  |
| -------------- | ---------------- |
| Git            | 2.56.0.windows.3 |
| Node.js        | v26.12.1         |
| npm            | 11.20.0          |
| Rust           | 1.99.1           |
| Cargo          | 1.99.1           |
| rustup         | 1.29.2           |
| Docker Desktop | 4.97.0           |
| Docker Engine  | 29.9.2           |
| Docker Compose | 5.6.1            |
| WebView2       | 156.0.4314.58    |
| MSVC           | 14.51.36231      |
| Windows SDK    | 10.0.26100.0     |
| WSL            | 2                |
| Ubuntu no WSL  | Instalado        |

### Docker validado

O Docker Engine foi iniciado e testado com:

```powershell
docker version
docker run --rm hello-world
```

Resultado:

```text
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

O contexto ativo é `desktop-linux`.

O WSL possui:

```text
Ubuntu            Stopped    2
docker-desktop    Running    2
```

Isso é normal. A distribuição Ubuntu não precisa ficar ligada permanentemente.

### MSVC validado

Compilador encontrado em:

```text
C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64\cl.exe
```

Também foram encontrados os compiladores para outras arquiteturas.

O arquivo `VsDevCmd.bat` está presente.

Windows SDK:

```text
10.0.26100.0
```

Observação: a instalação é Visual Studio Build Tools 2026, não 2022. O toolset e o compilador estão presentes, mas a compatibilidade efetiva com o Tauri/Rust deve ser validada durante a compilação real.

### PostgreSQL

Não está instalado diretamente no Windows.

A estratégia definida é executar PostgreSQL via Docker.

Uma instalação PostgreSQL 16.15 foi feita anteriormente no ambiente Linux isolado do Claude no navegador. Ela não está instalada no computador local e não deve ser confundida com o ambiente de desenvolvimento atual.

# 14. SITUAÇÃO DO PROJETO

Neste momento:

- Planejamento do produto: concluído.
- Arquitetura inicial: definida.
- Identidade visual: definida.
- Stack: definida.
- Fases de desenvolvimento: definidas.
- Análise arquitetural externa: realizada.
- Ferramentas locais: instaladas.
- Docker: testado com sucesso.
- MSVC e Windows SDK: encontrados.
- Compatibilidade real de compilação: ainda precisa ser testada.
- Repositório local definitivo: ainda precisa ser confirmado.
- Sprint 0: ainda não executada.

Não afirmar que o aplicativo já está implementado.

# 15. REGRAS DE TRABALHO PARA O AGENTE

Estas regras são obrigatórias durante todo o desenvolvimento.

### Antes de modificar qualquer coisa

1. Inspecione a estrutura atual do projeto.
2. Identifique arquivos existentes.
3. Verifique o estado do Git.
4. Identifique tecnologias e versões instaladas.
5. Verifique se já existe código que possa ser aproveitado.
6. Apresente os riscos e incompatibilidades encontrados.
7. Não substitua arquivos existentes sem entender seu conteúdo.

### Durante a implementação

- Trabalhe somente na fase autorizada.
- Não implemente funcionalidades de fases futuras antecipadamente.
- Preserve funcionalidades existentes.
- Não apague código sem justificativa.
- Não introduza dependências desnecessárias.
- Não invente resultados de testes.
- Não esconda erros.
- Não utilize soluções improvisadas para fazer os testes passarem.
- Priorize segurança, legibilidade e manutenção.
- Valide entradas.
- Trate erros.
- Utilize tipagem adequada.
- Evite duplicação desnecessária.
- Documente decisões importantes.

### Ao concluir uma tarefa

Informe:

1. O que foi implementado.
2. Quais arquivos foram criados.
3. Quais arquivos foram alterados.
4. Dependências adicionadas.
5. Comandos executados.
6. Testes realizados.
7. Resultado real de cada teste.
8. Problemas encontrados.
9. Pendências.
10. Próximo passo recomendado.

Não avance automaticamente para outra fase sem autorização.

# 16. COMO TRABALHAR NO ANTIGRAVITY

Você está sendo utilizado dentro do Antigravity, com a intenção de trabalhar diretamente no ambiente local do Windows.

Antes de começar, confirme:

- Se o Antigravity está realmente em Local Mode.
- Qual é a pasta de projeto aberta.
- Se o terminal está executando comandos no Windows local.
- Se o Git está funcionando.
- Se o Docker está acessível pelo terminal.
- Se o ambiente Rust e MSVC está acessível.

Não confunda o terminal local com ambientes remotos ou máquinas virtuais.

Não declare que executou algo no computador local se o comando foi executado em outro ambiente.

### Permissões

Solicite aprovação antes de:

- Instalar ferramentas.
- Modificar configurações globais do sistema.
- Apagar arquivos ou diretórios.
- Executar comandos destrutivos.
- Alterar configurações de segurança.
- Fazer alterações fora da pasta do projeto.
- Publicar ou enviar código para serviços externos.

Não exponha segredos, tokens, senhas ou dados pessoais nos logs.

### Git

Utilize Git desde o início.

- Crie commits por etapas lógicas.
- Não faça commits automáticos sem autorização.
- Não altere histórico remoto.
- Não force push.
- Não sobrescreva alterações locais do usuário.
- Verifique `git status` antes de mudanças relevantes.

# 17. PRIMEIRA TAREFA: PREPARAÇÃO E SPRINT 0

Não comece implementando funcionalidades do aplicativo.

Primeiro, faça uma inspeção do ambiente e apresente um relatório de compatibilidade.

### Etapa A: diagnóstico

Verifique:

- Diretório atual.
- Estado do Git.
- Node e npm.
- Rust e Cargo.
- MSVC.
- Windows SDK.
- WebView2.
- Docker.
- Docker Compose.
- WSL.
- Possibilidade de compilar um projeto Tauri mínimo.

Não instale nada automaticamente.

Node 26.12.1 deve ser avaliado quanto à compatibilidade com as dependências escolhidas. Não faça downgrade sem justificar.

### Etapa B: planejamento técnico da Sprint 0

Apresente a ordem de implementação e os arquivos que pretende criar.

A Sprint 0 deve contemplar:

**S0.1: Inspeção do ambiente**

Diagnóstico e compatibilidade.

**S0.2: Monorepo**

- npm Workspaces.
- Estrutura de diretórios.
- Configurações compartilhadas.
- Scripts de desenvolvimento.

**S0.3: Pacote shared**

- Tipos.
- Schemas.
- Constantes.
- Validações compartilhadas.

**S0.4: Backend**

- Fastify.
- Configuração validada com Zod.
- PostgreSQL.
- Kysely.
- Endpoint de liveness.
- Endpoint de readiness.
- Encerramento gracioso.
- Executor de migrations.

**S0.5: Testes**

- Vitest.
- Testes unitários.
- Testes de integração com PostgreSQL real.
- Testes de configuração.
- Testes de endpoints.

**S0.6: Desktop**

- Tauri 2.
- React.
- TypeScript.
- Vite.
- Interface inicial.
- Indicador de conexão com backend e banco.
- Botão de tentativa de reconexão.
- Tokens CSS da identidade visual.

Não criar uma interface completa nesta etapa.

**S0.7: Docker**

- Dockerfile multi-stage.
- Usuário não privilegiado no container do servidor.
- Docker Compose com PostgreSQL e servidor.
- Persistência de dados.
- Healthcheck.
- Configurações por ambiente.

**S0.8: CI**

- Instalação de dependências.
- Lint.
- Typecheck.
- Testes.
- Build.

**S0.9: Medições**

Medir e documentar:

- Inicialização do desktop.
- Tempo de carregamento da interface.
- Consumo de memória em repouso.
- Inicialização do backend.
- Tempo de resposta dos endpoints.
- Uso de memória dos containers, quando possível.

Diferenciar claramente resultados locais, resultados da CI e estimativas.

**S0.10: Documentação**

- README.
- Como instalar.
- Como executar.
- Como testar.
- Como configurar variáveis.
- Como executar migrations.
- Como iniciar e parar os serviços.
- Problemas conhecidos.

**S0.11: Relatório final**

Apresentar todos os resultados e pendências.

### Restrições da Sprint 0

Não implementar:

- Autenticação.
- Cadastro.
- Login.
- Grupos.
- Mensagens.
- Socket.IO funcional.
- LiveKit.
- Chamadas.
- Compartilhamento de tela.
- Redis.
- Microserviços.
- Infraestrutura de produção.
- Caddy.

Esses recursos pertencem às fases seguintes.

# 18. CRITÉRIOS DE ACEITAÇÃO DA SPRINT 0

A Sprint 0 só será considerada concluída quando:

- O monorepo estiver organizado.
- O desktop compilar.
- O backend iniciar.
- O PostgreSQL iniciar via Docker.
- O backend conseguir conectar ao banco.
- Os endpoints de saúde funcionarem.
- Os testes automatizados passarem.
- O lint passar.
- O typecheck passar.
- Os builds funcionarem.
- A documentação permitir reproduzir o ambiente.
- As medições reais estiverem documentadas.

Se alguma parte não funcionar, documentar o problema e apresentar a causa provável. Não declarar conclusão falsa.

# 19. CRITÉRIOS DE SUCESSO DO PRODUTO

No futuro, o ResET deverá permitir:

- Criar contas publicamente.
- Criar e administrar grupos.
- Conversar em tempo real.
- Manter histórico de mensagens.
- Entrar em salas permanentes.
- Fazer chamadas de voz e vídeo.
- Compartilhar tela.
- Utilizar o sistema em diferentes computadores.
- Manter dados persistentes.
- Reconectar automaticamente.
- Instalar e utilizar o aplicativo sem configurações técnicas complicadas.

O produto deve ser confiável, rápido e simples.

---

# 20. INSTRUÇÃO FINAL AO CLAUDE

Você está recebendo o contexto completo do ResET e deve utilizá-lo como referência principal durante o desenvolvimento.

Quero que trabalhe como engenheiro de software experiente, com atenção especial à arquitetura, desempenho, segurança, qualidade de código e manutenção.

Não quero que você simplesmente gere uma grande quantidade de arquivos e declare o projeto pronto.

Quero desenvolvimento incremental, com decisões justificadas, testes reais e documentação.

**Neste primeiro momento, NÃO implemente a Sprint 0 ainda.**

Faça o seguinte:

1. Confirme que está no ambiente local do Windows.
2. Confirme qual diretório está aberto.
3. Inspecione o ambiente de desenvolvimento.
4. Analise a compatibilidade da stack com as versões instaladas.
5. Identifique possíveis problemas com Tauri, Rust, Node, MSVC e Docker.
6. Revise criticamente a arquitetura e as decisões deste documento.
7. Identifique contradições, riscos e pontos que precisam de ajustes.
8. Apresente um plano de execução da Sprint 0 adaptado ao ambiente real.
9. Não instale ferramentas, não crie arquivos e não modifique o projeto nesta primeira resposta.

Quero primeiro um relatório técnico e uma proposta de execução.

**A implementação só começa depois da minha aprovação.**

O ChatGPT continuará participando como parceiro de arquitetura e revisão. Quando necessário, fornecerei a ele seus relatórios, alterações e resultados para análise conjunta.

O objetivo não é terminar rapidamente. É construir o ResET corretamente, sem complexidade desnecessária e sem comprometer a qualidade.
