---
titulo: Estatística básica
subtitulo: Média, mediana, moda, dispersão e gráficos
disciplina: Matemática
frequencia: 3
tempo: 40 min
topicos: mat-estatistica
---

## Por que isso importa

Estatística caiu no caderno 2026.2 (Q31, média aritmética de um conjunto de números) e é a matemática mais usada em Engenharia de Produção (controle de qualidade, indicadores). Cada questão vale **2,5 pontos** (edital, item 8.1.2) e as contas são curtas.

## O essencial

### Medidas de posição

> [!formula] Média aritmética
> **média = soma dos valores / quantidade**
> Consequência que cai muito: **soma = n · média**

> [!formula] Média ponderada
> **média = (x₁ · p₁ + x₂ · p₂ + …) / (p₁ + p₂ + …)**

- **Mediana:** o valor do meio com os dados **em ordem**. Quantidade par → média dos dois do meio.
- **Moda:** o valor que mais se repete (pode haver mais de uma, ou nenhuma).

### Medidas de dispersão

- **Amplitude:** maior − menor.
- **Variância:** média dos quadrados dos desvios em relação à média.
- **Desvio padrão:** raiz quadrada da variância. Quanto maior, mais espalhados os dados.

> [!formula] Dispersão
> **Var = Σ (xᵢ − média)² / n**  ·  **DP = √Var**

### Propriedades úteis

- Somar uma constante a todos os valores: a média aumenta essa constante; o desvio padrão **não muda**.
- Multiplicar todos os valores por k: média e desvio padrão ficam multiplicados por k.

### Gráficos

- **Setores (pizza):** ângulo do setor = porcentagem · 360°. Ex.: 25% → 90°.
- **Barras / colunas:** comparar categorias.
- **Linhas:** evolução no tempo.
- **Histograma:** frequências por faixas (classes) de valores.

## Exemplos resolvidos

> [!exemplo] Exemplo 1 — nota que faltava
> A média de 5 notas é 7. Com uma 6ª nota, a média vai para 7,5. Qual foi a 6ª nota?
> Soma antes: 5 · 7 = 35. Soma depois: 6 · 7,5 = 45. **Nota = 45 − 35 = 10**.

> [!exemplo] Exemplo 2 — mediana par
> Dados: 3, 8, 1, 9, 4, 6 → em ordem: 1, 3, 4, 6, 8, 9.
> Meio: 4 e 6 → **mediana = 5**.

> [!exemplo] Exemplo 3 — média ponderada
> Prova (peso 2) nota 6; trabalho (peso 3) nota 8.
> (6 · 2 + 8 · 3) / 5 = 36/5 = **7,2**.

> [!exemplo] Exemplo 4 — desvio padrão
> Dados 2, 4, 6: média 4. Desvios: −2, 0, 2. Var = (4 + 0 + 4)/3 = 8/3. **DP = √(8/3) ≈ 1,6**.

## Pegadinhas

> [!pegadinha] Mediana sem ordenar
> Ordene **antes** de procurar o meio. O valor do meio na lista desordenada não é a mediana.

> [!pegadinha] Retirar ou incluir um valor
> Mudou a quantidade de dados? Recalcule pela **soma**: soma nova = soma antiga ± valor; divida pela quantidade nova.

> [!pegadinha] Média ponderada ≠ média simples
> Com pesos diferentes, divida pela **soma dos pesos**, não pelo número de notas.

> [!dica]
> Quase toda questão de média se resolve com soma = n · média. Comece por ela.

> [!resumo] Resumo de 1 minuto
> - Média = soma/n; soma = n · média
> - Ponderada: Σ(x · p)/Σp
> - Mediana: ordena e pega o meio; moda: mais frequente
> - DP = √variância; somar constante não muda o DP
> - Setor: % · 360°

## Exercícios

**1.** A média aritmética dos números 4, 7, 7, 10 e 12 é:

(A) 7
(B) 8
(C) 10
(D) 9

**2.** A moda do conjunto {2, 3, 3, 5, 7, 7, 7, 9} é:

(A) 3
(B) 5
(C) 7
(D) 9

**3.** A mediana do conjunto {10, 2, 8, 6, 4} é:

(A) 6
(B) 8
(C) 4
(D) 5

**4.** A média de 10 números é 20. Retirando-se o número 38, a média dos 9 números restantes passa a ser:

(A) 20
(B) 19
(C) 17
(D) 18

**5.** Num gráfico de setores, um setor de 72° representa:

(A) 72% do total
(B) 20% do total
(C) 25% do total
(D) 7,2% do total

**6.** Somando-se 5 a todos os valores de um conjunto de dados:

(A) a média e o desvio padrão aumentam 5.
(B) só o desvio padrão muda.
(C) a média aumenta 5 e o desvio padrão não muda.
(D) nada muda.

**7.** Um aluno tirou 5 (peso 1), 8 (peso 2) e 9 (peso 2). Sua média ponderada é:

(A) 7,8
(B) 7,3
(C) 8,0
(D) 7,5

## Gabarito

**1. B** — soma 40 ÷ 5 = 8.

**2. C** — 7 aparece três vezes.

**3. A** — em ordem: 2, 4, 6, 8, 10 → meio = 6.

**4. D** — soma = 200; sem o 38: 162 ÷ 9 = 18.

**5. B** — 72/360 = 0,2 = 20%.

**6. C** — todos os valores andam 5 juntos: a média anda 5 e a dispersão fica igual.

**7. A** — (5 + 16 + 18)/5 = 39/5 = 7,8.

Engenharia de Produção vive de estatística. Comece agora. Go, Julls!
