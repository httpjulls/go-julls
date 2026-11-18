# Go, Julls!

App Android pessoal de estudos para o **Vestibular CEDERJ 2027/1 — Bacharelado em Engenharia de Produção** (prova em 06/12/2026, 10h, 3 horas). Diz todo dia o que estudar, por quanto tempo e por quê, e traz as ferramentas para estudar dentro dele. Offline-first, sincroniza celular e tablet pela mesma conta.

> Projeções de nota são estimativas de estudo, não previsão de resultado. Regras conforme `docs/Edital-de-Selecao-2027.1-Final.pdf`.

---

## 1. Instalar no celular e no tablet

1. Baixe o `go-julls-vX.Y.Z.apk` (da pasta `release/`, de um artefato do GitHub Actions ou da Release do GitHub) no próprio aparelho.
2. Abra o arquivo. Na primeira vez, o Android pede para **permitir instalar apps desta fonte** (Chrome, Arquivos ou Drive, conforme o app usado para abrir). Permita só para esse app.
3. Instale e abra. Permita as **notificações** (lembretes) e, quando usar, a **câmera** (fotos de anotações).
4. Faça login com a sua conta. No segundo aparelho, basta fazer login com a mesma conta: tudo é baixado.

**Atualizar:** instale o APK novo por cima (mesma assinatura → os dados ficam). O app avisa na tela Hoje quando há versão nova, se a verificação de atualização estiver configurada (seção 5).

**Restaurar em outro aparelho:** instale e faça login. Sem conta, use Configurações → Exportar backup (JSON) e Importar backup no outro aparelho.

---

## 2. Supabase (sincronização) — plano gratuito

1. Crie um projeto em <https://supabase.com> (região São Paulo). Anote **Project URL** e **anon public key** (Project Settings → API).
2. **SQL Editor** → cole e rode `supabase/migrations/0001_init.sql` (cria as tabelas, RLS em todas, triggers de sincronização e o bucket privado de fotos `attachments`).
3. **Authentication → Users → Add user**: crie a sua conta (e-mail e senha, marque *Auto Confirm User*).
4. **Authentication → Sign In / Providers → Email**: **desative “Allow new users to sign up”**. Ninguém mais consegue criar conta.
5. Na raiz do projeto, copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Gere o APK de novo (seção 3).

A chave `anon` pode ir dentro do app: a segurança está na Row Level Security (cada usuário só lê e grava as próprias linhas). Nunca coloque a `service_role` no app.

Sem `.env`, o app funciona normalmente só no aparelho (“só neste aparelho”) e sobe tudo quando você fizer login num build com Supabase.

---

## 3. Gerar o APK localmente (Windows)

Pré-requisitos (já instalados nesta máquina): Node 20+, **JDK 17** (`%USERPROFILE%\devtools\jdk-17*`), **Android SDK** (`%LOCALAPPDATA%\Android\Sdk`, plataforma 34/35).

```bash
npm install
```

```bash
npm test
```

```bash
npm run android:release
```

O APK assinado sai em `release/go-julls-vX.Y.Z.apk`.

O que o script faz (`scripts/build-apk.ps1`): `npm run build` → `npx cap sync android` → `gradlew assembleRelease`.
**Atenção:** o nome da pasta tem `!` (“GO, JULLS!”), e o Java/Gradle quebra com `!` no caminho (`!/` é separador de `.jar`). Por isso o script roda o Gradle por uma *junction* sem `!` em `%USERPROFILE%\gojulls`, que aponta para esta mesma pasta (nada é copiado). O build web (`vite`) roda na pasta real, porque o Vite não aceita a junction. Em outro sistema, o equivalente manual é:

```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleRelease
```

### Keystore (assinatura) — MUITO IMPORTANTE

- Arquivo: `%USERPROFILE%\.gojulls-keystore\gojulls-release.jks`
- Senha e alias: `%USERPROFILE%\.gojulls-keystore\keystore.properties` (cópia em `android/keystore.properties`, ignorada pelo git).
- **Faça backup dos dois arquivos fora do computador** (pendrive, gerenciador de senhas). Sem eles, nenhuma atualização instala por cima e seria preciso desinstalar o app.
- **Nunca** coloque a keystore ou a senha no repositório (`.gitignore` já bloqueia `*.jks`, `*.keystore`, `keystore.properties`, `.env`).

### Nova versão

1. Aumente `"version"` no `package.json` (ex.: `1.0.0` → `1.0.1`). O `versionCode` do Android é calculado sozinho (`1.0.1` → `10001`) e o nome do arquivo também.
2. Gere o APK (local ou GitHub Actions) e instale por cima.

---

## 4. Ícone e splash

Desenho original (J com raio, rosa sobre preto). Para regenerar todas as densidades, o ícone adaptativo, o monocromático do Android 13+ e o splash:

```bash
npm run icons
```

Ícone de notificação: `android/app/src/main/res/drawable/ic_stat_gojulls.xml` (vetor branco).

---

## 5. GitHub Actions (APK sem Android Studio)

Workflow: `.github/workflows/android.yml`.

1. Crie um repositório e envie o código (a keystore e o `.env` ficam de fora).
2. Em **Settings → Secrets and variables → Actions**, crie:
   - `KEYSTORE_BASE64` — conteúdo da keystore em base64. No PowerShell:
     ```bash
     powershell -Command "[Convert]::ToBase64String([IO.File]::ReadAllBytes(\"$env:USERPROFILE\.gojulls-keystore\gojulls-release.jks\")) | Set-Clipboard"
     ```
   - `KEYSTORE_PASSWORD`, `KEY_PASSWORD` (valores de `keystore.properties`) e `KEY_ALIAS` (`gojulls`)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. **Actions → Build APK → Run workflow**: o APK sai como artefato (baixe pelo navegador do celular, logado no GitHub).
4. Para publicar uma Release: `git tag v1.0.1 && git push --tags` (a tag precisa bater com o `package.json`). A Release recebe o `.apk` e o `latest.json`.

**Verificação de atualização:** o app lê `https://github.com/<você>/<repo>/releases/latest/download/latest.json`. Isso só funciona sem login se as Releases forem públicas. Se preferir o código privado, crie um segundo repositório público só para as Releases e ajuste `VITE_UPDATE_URL`.

---

## 6. Como o app funciona

| Pasta | O quê |
|---|---|
| `src/core/` | Funções puras e testadas: regras do edital (`exam.ts`), planejador (`planner.ts`), projeção e riscos (`projection.ts`), SM-2 (`sm2.ts`), contagem de linhas da redação (`lines.ts`) |
| `src/db/` | Banco local (Dexie/IndexedDB), repositório com fila de saída, estado derivado do histórico, backup |
| `src/sync/` | Motor de sync (offline-first) e adaptador Supabase |
| `src/data/` | Seed: mapa de matérias, formulário, eixos de redação, tabela periódica |
| `src/screens/` | Telas |
| `supabase/migrations/` | SQL versionado |
| `tests/` | Vitest: planejador, regras/nota, sync com dois aparelhos, ponta a ponta, contraste de cores |

**Planejador (“Norte”):** valor do tópico ≈ (pontos da disciplina ÷ nº de tópicos) × frequência × (1 − domínio/5) + bônus (erros recentes, domínio que caiu, tópico parado). Pisos: Matemática e Física a cada 3 dias, Português a cada 5, redação a cada 3; rotação curta de Biologia, Química, Geografia, História e língua estrangeira. Alocação gulosa em blocos de 25–50 min, alternando disciplinas. Última semana: menos conteúdo novo, mais revisão e um simulado; véspera: revisão leve. O plano é recalculado a partir do estado atual, então dia perdido não vira dívida. Parâmetros em Configurações → Planejador.

**Sincronização:** todo registro tem `id` (UUID do cliente), `updated_at` e `device_id`. Tabelas mutáveis: vence o `updated_at` mais recente (aplicado no cliente e por trigger no Postgres). Sessões, domínio, erros, tentativas, revisões de flashcards e conquistas são **append-only** (nunca sobrescritos; o estado atual é calculado do histórico). Escritas offline vão para uma fila e sobem ao reconectar, com retentativa; reenvio não duplica. O indicador mostra “sincronizado”, “sincronizando” ou “offline · N pendências”.

**Pesos na nota final (de 100):** Redação 37 · Matemática 15 · Física 15 · Português 6 · Biologia 6 · Química 6 · Geografia 6 · História 6 · Língua estrangeira 3.

### Novidades da v1.1.0

- **Cronograma** (Mais → Cronograma): previsão dia a dia até a prova, rodando o planejador como se cada bloco fosse cumprido (`src/core/schedule.ts`). Se um dia não der, o resto se ajusta sozinho. O simulado da reta final agora cai num dia longo até 9 dias antes da prova (pega o fim de semana); sem dia longo, entra um simulado parcial a 3–4 dias.
- **Importar prova em PDF** (Questões → Importar prova): o app lê o caderno com pdf.js (offline), separa as duas colunas, encontra as questões 01–45 e as alternativas (A)–(D), aplica o gabarito (PDF separado, texto colado ou seção "Gabarito" no mesmo PDF), recorta cada questão da página como imagem (figuras e fórmulas) e mostra tudo para revisão antes de salvar. Testado com os cadernos 2026.1 e 2026.2 de `docs/` (`src/import/examParser.ts`). PDF escaneado (foto) não tem texto e não pode ser lido.
- **Simulado de prova importada**: o caderno inteiro, na ordem, com 3h cronometradas (Simulado → Refazer uma prova importada).
- **Listas e PDFs** (no estilo da skill Go, Julls!): lista de exercícios do banco (por matéria, tópico, prova ou só as erradas), prova completa para fazer no papel e **PDF de estudo de um tópico** (Mapa → tópico): por que importa, formulário, suas anotações e exercícios, com cartão-resposta e gabarito. No Android abre a impressão do sistema → "Salvar como PDF" (plugin nativo `PrintPlugin.java`); no navegador, Imprimir → Salvar como PDF. Questões de Matemática, Física e Química importadas saem como recorte do original, para não perder fórmulas e subscritos.
- **Corrigir pelo número**: em cada lista/prova, diga só as que errou ("3, 7, 12-14") ou marque certo/errado/letra por número. O app grava as tentativas e manda as erradas para o **banco de erros** com o número da questão e o motivo; corrigir de novo não duplica.
- **Excluir anotações e fotos**: lixeira na lista e na anotação (com confirmação; a exclusão vale para todos os aparelhos).
- O app não tem IA embutida: os PDFs usam o que já está nele (anotações, formulário, banco de questões). Material com teoria nova continua vindo da skill `gojulls-pdf` no Claude.

---

## 7. Conferência com os PDFs em `docs/`

Conferido no edital 2027.1:
- 45 questões A–D (5.2.1, p. 9); específicas Matemática e Física (5.2.2, p. 9); 3 horas (5.4.5, p. 10)
- Redação 20–25 linhas e critérios 30/30/40 (5.3.1–5.3.2, p. 10; 8.2, p. 14); motivos de zero (8.2.1, p. 14–15)
- Eliminação por zero em Português ou específica (6.3.1) e corte de 31 pontos para corrigir redação (6.3.2), ajuste por polo (6.3.3–6.3.4), zero na redação elimina (6.3.6) — p. 13
- 33 × 1,0 + 12 × 2,5 = 63 (8.1.2, p. 14); NF = N1 + N2 × 0,37 e desempate (8.3–8.6, p. 15)
- Datas do Anexo 1 (p. 29–30)

Conferido nos cadernos 2026.1 e 2026.2: 6 questões por disciplina e 3 de língua estrangeira, na ordem Port 1–6, Bio 7–12, Fís 13–18, Geo 19–24, Hist 25–30, Mat 31–36, Quím 37–42, LE 43–45. A tabela periódica vem na última página.

Tópicos do seed: conferidos com o Conteúdo Programático 2027.1 (os de Biologia vieram de texto extraído com sobreposição de colunas; confira no PDF).

**Não verificado:**
- A **distribuição de 6 por disciplina** vem dos cadernos; o edital não a fixa.
- **Frequências** marcadas “estimativa pelo programa” não vêm dos cadernos; só as com referência `C26.1 Qn` / `C26.2 Qn` apareceram nas provas. Ajuste no Mapa.
- **Prorrogação das inscrições até 15/11/2026**: não está no edital; confira no site oficial.
- **Proposta de intervenção** não é critério explícito do edital CEDERJ (é do ENEM); está no mapa com peso baixo.
- O **formulário** de Matemática e Física é um esqueleto gerado pelo app: revise com seu material.
- **Modo Aluna CEDERJ**: a fórmula da média e a nota de aprovação são configuráveis e começam em branco; preencha conforme o regulamento oficial.

---

## 8. Privacidade

Sem anúncios, rastreadores ou serviços pagos. Dados ficam no aparelho (IndexedDB) e na sua conta Supabase com RLS. Nada pessoal vai para logs.
