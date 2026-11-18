---
name: gojulls-pdf
description: Gera PDFs de material de estudo (apostila, resumo, lista de exercícios) de uma matéria ou tópico do Vestibular CEDERJ na identidade visual do app Go, Julls! — capa branca com rosa (econômica para imprimir) ou versão escura para tablet, caixas de fórmula, dicas e pegadinhas, exercícios no estilo da prova e gabarito. Use sempre que a Juliana pedir material, resumo, apostila, PDF, "folha de revisão", lista de exercícios ou "algo para estudar" sobre um tópico (ex.: "faz um PDF de circuitos", "material de probabilidade pro tablet", "resumo de Modernismo pra imprimir"), mesmo que ela não diga "PDF" ou "Go, Julls".
---

# PDFs de matéria — Go, Julls!

A Juliana estuda para o Vestibular CEDERJ 2027/1 (Engenharia de Produção, prova em 06/12/2026, sem calculadora e sem consulta) e tem pouco tempo e pouco material. Cada PDF deve ser um material **completo, direto e confiável** sobre um tópico: o que ela precisa saber para acertar as questões, nada além.

## O que a skill traz

- `references/mapa-materias.md` — todos os tópicos por disciplina, com pontos na nota final e frequência nas provas (C26.x Qn = caiu naquela questão do caderno). **Leia antes de escrever**, para acertar nome do tópico, frequência e foco.
- `references/regras-prova.md` — regras do edital 2027.1 com os itens. Use só isso (ou o edital, se estiver disponível) para afirmar algo sobre a prova.
- `scripts/gerar-pdf.mjs` — Markdown → PDF na identidade visual. Não precisa de `npm install`: fonte e conversor estão embutidos.

Se houver mais material disponível, use também: no Projeto do Claude, os arquivos do projeto (edital, conteúdo programático, cadernos); no código do app Go, Julls!, `src/data/formulas.ts` (formulário revisado) e `docs/`.

## Fluxo

1. **Escolha o tópico** no mapa. Se o pedido for vago ("material de Física"), pegue o de maior frequência e diga qual escolheu.
2. **Escreva o Markdown** seguindo a estrutura abaixo. Salve em `materiais/<disciplina>/<topico>.md` (no código do app) ou numa pasta de trabalho (no chat).
3. **Gere o PDF:**
   ```bash
   node <pasta-da-skill>/scripts/gerar-pdf.mjs materiais/fisica/circuitos.md
   ```
   - Padrão: tema claro — capa branca com detalhes rosa e páginas brancas, para imprimir gastando pouca tinta.
   - `--tema escuro` → versão para ler no tablet (capa e páginas pretas).
   - `--saida caminho.pdf` → outro destino. `--html` → também salva o HTML (para conferir o visual).
   - O script procura Edge/Chrome/Chromium (inclusive o do Playwright). Sem navegador, tenta o WeasyPrint. Se nada existir, ele salva o **HTML** e sai com código 2: entregue o HTML e explique que basta abrir no Chrome/Edge → Imprimir → Salvar como PDF, marcando "Gráficos de fundo".
4. **Confira** contas, gabarito e o visual (capa, caixas, tabelas) antes de entregar.
5. **Entregue** o PDF (no chat, como arquivo para baixar) com 2–3 linhas sobre o conteúdo.

## Estrutura do Markdown

```markdown
---
titulo: Circuitos elétricos
subtitulo: Lei de Ohm, associações, potência e medidores
disciplina: Física
frequencia: 5
tempo: 50 min
---

## Por que isso importa
Uma ou duas frases: quanto vale (Física = 2,5 por questão), quanto cai (cite C26.x Qn se houver).

## O essencial
Teoria enxuta, em tópicos curtos. Conceito antes da fórmula.

> [!formula] Lei de Ohm
> **U = R · i**
> P = U · i = R · i² = U²/R

## Exemplos resolvidos
> [!exemplo] Exemplo 1 — título curto
> Enunciado curto.
> Resolução passo a passo. **Resposta: …**

## Pegadinhas
> [!pegadinha] Amperímetro x voltímetro
> O erro comum e como evitar.

> [!dica]
> Atalho de prova (ex.: dois resistores iguais em paralelo = R/2).

> [!resumo] Resumo de 1 minuto
> - 4 a 6 linhas para revisar na véspera

## Exercícios
**1.** Enunciado no estilo CEDERJ…

(A) …
(B) …
(C) …
(D) …

## Gabarito
**1. C** — resolução em 1–3 linhas.
```

- Cabeçalho: `titulo` (obrigatório), `disciplina`, `subtitulo`, `frequencia` (1–5, do mapa), `tempo`. Os pontos saem da disciplina (pode forçar com `pontos:`).
- Caixas: `[!formula]`, `[!exemplo]`, `[!dica]`, `[!pegadinha]`, `[!atencao]`, `[!resumo]`; o texto depois do marcador vira o título.
- Cada linha dentro de parágrafo ou caixa vira uma linha no PDF. `## Gabarito` começa em página nova. Tabelas no formato `| a | b |`.

## Como escrever bem para ela

- **Tamanho**: 4 a 8 páginas — cabe em um ou dois blocos de estudo de 25–50 min.
- **Sem calculadora**: números que dá para fazer à mão (g = 10 m/s², resistências 2, 3, 6 Ω, ângulos notáveis, potências de 10). Mostre o truque de conta quando houver.
- **Exercícios originais**, 5 a 8, alternativas A–D (uma por linha), no nível e estilo dos cadernos 2026 (contexto curto do cotidiano, uma ideia por questão). Não copie questões de provas; pode dizer "parecida com a Q16 do caderno 2026.1".
- **Gabarito com resolução curta** para cada questão. Confira cada conta duas vezes: gabarito errado faz mais mal que nenhum. Varie a letra correta.
- **Fórmulas em Unicode** (U = R · i, v², √2, Δθ, π, ≥, subscritos ₁ ₂) — o PDF não renderiza LaTeX.
- **Tom**: pt-BR, direto e motivador, sem infantilizar. Uma frase de incentivo no fim ("Circuitos é ponto garantido. Go, Julls!").
- **Precisão sobre a prova**: só afirme regras que estão em `references/regras-prova.md` ou no edital, citando o item. Não invente estatísticas de "quanto cai".

### Redação
Estrutura própria: modelo dissertativo-argumentativo (introdução com tese, 2 desenvolvimentos, conclusão), conectivos por função, como usar repertório, checklist dos critérios do edital (formais 30, textuais 30, discursivos 40) e motivos de nota zero (incluindo menos de 20 linhas), e uma proposta de tema para treinar com eixos de argumentos — sem redação pronta para decorar.

### Língua estrangeira e Português
Foco em estratégia de leitura: textos curtos autorais, vocabulário e cognatos, perguntas de compreensão A–D.

## Vários tópicos de uma vez
Para "faz o material de Física toda", gere um PDF por tópico (maior frequência primeiro) em vez de um PDF gigante, e liste todos no fim.
