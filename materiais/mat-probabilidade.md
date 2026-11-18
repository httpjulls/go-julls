---
titulo: Probabilidade
subtitulo: Casos favoráveis, "ou", "e", complementar e condicional
disciplina: Matemática
frequencia: 5
tempo: 50 min
topicos: mat-probabilidade
---

## Por que isso importa

Matemática vale **2,5 pontos por questão** (edital, item 8.1.2) e probabilidade caiu nos dois últimos cadernos (2026.1 Q33 e 2026.2 Q35). As questões costumam ser curtas e resolvidas com contagem simples: ótimo para garantir ponto sem calculadora.

## O essencial

- **Espaço amostral (Ω):** todos os resultados possíveis.
- **Evento:** os resultados que interessam.
- Com resultados igualmente prováveis, probabilidade é **favoráveis ÷ possíveis**.
- Toda probabilidade fica entre **0** (impossível) e **1** (certo). Em porcentagem, entre 0% e 100%.

> [!formula] Definição
> **P(A) = casos favoráveis / casos possíveis**
> 0 ≤ P(A) ≤ 1

### Complementar ("não acontecer")

> [!formula] Complementar
> **P(não A) = 1 − P(A)**
> "Pelo menos um" = 1 − P(nenhum)

### "Ou" (união)

- Some as probabilidades e **tire o que contou duas vezes** (a interseção).
- Se os eventos não podem ocorrer juntos (mutuamente exclusivos), a interseção é zero.

> [!formula] União
> **P(A ou B) = P(A) + P(B) − P(A e B)**

### "E" (interseção) com eventos independentes

- Independentes: um não muda a chance do outro (moedas, dados, sorteios **com reposição**).
- **Sem reposição**, o segundo sorteio muda: atualize o numerador e o denominador.

> [!formula] Eventos independentes
> **P(A e B) = P(A) · P(B)**

### Probabilidade condicional

- "Sabendo que B aconteceu": o espaço amostral **encolhe** para B.

> [!formula] Condicional
> **P(A | B) = P(A e B) / P(B)**
> Na prática: conte os casos de A **dentro** de B e divida pelo total de B.

### Contagem que aparece junto

- Princípio multiplicativo: etapas independentes → multiplique as possibilidades.
- Combinação (ordem não importa): C(n, p) = n! / (p! · (n − p)!). Ex.: C(5, 2) = 10.

## Exemplos resolvidos

> [!exemplo] Exemplo 1 — "ou" com múltiplos
> Sorteia-se um inteiro de 1 a 20. Qual a probabilidade de ser múltiplo de 3 **ou** de 5?
> Múltiplos de 3: 6 (3, 6, 9, 12, 15, 18). Múltiplos de 5: 4 (5, 10, 15, 20). Dos dois (múltiplos de 15): 1.
> Favoráveis = 6 + 4 − 1 = 9. **P = 9/20.**

> [!exemplo] Exemplo 2 — pelo menos um
> Uma moeda é lançada 3 vezes. Probabilidade de sair **pelo menos uma** cara?
> P(nenhuma cara) = (1/2)³ = 1/8. **P = 1 − 1/8 = 7/8.**

> [!exemplo] Exemplo 3 — condicional
> Uma turma tem 40 alunos: 25 mulheres, das quais 10 usam óculos. Sorteia-se uma mulher. Probabilidade de ela usar óculos?
> O espaço encolhe para as 25 mulheres: **P = 10/25 = 2/5.**

> [!exemplo] Exemplo 4 — sem reposição
> Urna com 3 bolas vermelhas e 2 azuis. Retiram-se duas, sem reposição. Probabilidade de as duas serem vermelhas?
> 3/5 · 2/4 = 6/20 = **3/10.**

## Pegadinhas

> [!pegadinha] Contar duas vezes
> No "ou", o 15 é múltiplo de 3 **e** de 5. Se você não subtrair a interseção, conta ele duas vezes.

> [!pegadinha] "Entre 1 e 15"
> Leia com atenção se os extremos entram: "entre 1 e 15" costuma excluir os dois (sobram 13 números); "de 1 a 15" inclui (15 números).

> [!pegadinha] Com x sem reposição
> Sem reposição, o segundo sorteio tem **um a menos** no total e, se repetiu a cor, um a menos no favorável.

> [!dica]
> Viu "pelo menos um"? Calcule o contrário (nenhum) e faça 1 menos. Quase sempre é mais rápido.

> [!resumo] Resumo de 1 minuto
> - P = favoráveis / possíveis
> - "Ou": soma e tira a interseção
> - "E" independentes: multiplica
> - "Pelo menos um" = 1 − P(nenhum)
> - Condicional: o total vira só o grupo do "sabendo que"

## Exercícios

**1.** Lança-se um dado honesto. A probabilidade de sair um número primo é:

(A) 1/3
(B) 1/2
(C) 2/3
(D) 5/6

**2.** Lançam-se duas moedas honestas. A probabilidade de saírem duas caras é:

(A) 1/4
(B) 1/2
(C) 3/4
(D) 1/3

**3.** Lançam-se dois dados honestos. A probabilidade de a soma dos resultados ser 7 é:

(A) 1/12
(B) 7/36
(C) 1/6
(D) 1/9

**4.** Sorteia-se um número inteiro de 1 a 30. A probabilidade de ele ser múltiplo de 4 ou de 6 é:

(A) 2/5
(B) 1/3
(C) 1/5
(D) 7/30

**5.** A previsão indica 30% de chance de chuva em cada um dos próximos dois dias, de forma independente. A probabilidade de chover em pelo menos um dos dias é:

(A) 0,09
(B) 0,49
(C) 0,60
(D) 0,51

**6.** Uma urna tem 4 bolas brancas e 6 pretas. Retiram-se duas bolas, sem reposição. A probabilidade de as duas serem brancas é:

(A) 2/15
(B) 4/25
(C) 1/5
(D) 2/5

**7.** De um grupo de 5 pessoas, entre elas Ana e Bia, sorteiam-se 2 para uma comissão. A probabilidade de Ana e Bia serem as duas sorteadas é:

(A) 1/5
(B) 2/5
(C) 1/10
(D) 1/20

## Gabarito

**1. B** — primos de 1 a 6: 2, 3 e 5 → 3/6 = 1/2. (O 1 não é primo.)

**2. A** — (1/2) · (1/2) = 1/4.

**3. C** — pares com soma 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) → 6/36 = 1/6.

**4. B** — múltiplos de 4: 7; de 6: 5; de 12 (dos dois): 2 → 7 + 5 − 2 = 10 → 10/30 = 1/3.

**5. D** — P(não chover nos dois) = 0,7 · 0,7 = 0,49 → 1 − 0,49 = 0,51.

**6. A** — 4/10 · 3/9 = 12/90 = 2/15.

**7. C** — comissões possíveis: C(5, 2) = 10; só uma tem Ana e Bia → 1/10.

Probabilidade é contar com calma. Go, Julls!
