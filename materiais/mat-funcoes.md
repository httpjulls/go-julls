---
titulo: Funções
subtitulo: Afim, quadrática, exponencial, logarítmica e domínio
disciplina: Matemática
frequencia: 5
tempo: 50 min
topicos: mat-funcoes
---

## Por que isso importa

Funções é o tópico de Matemática que mais apareceu nos cadernos recentes: domínio (2026.1 Q34), quadrática (2026.2 Q32) e equação exponencial (2026.2 Q36). Cada questão vale **2,5 pontos** (edital, item 8.1.2). Foque em quadrática, exponencial e domínio.

## O essencial

### Função afim — f(x) = ax + b

- Gráfico: reta. **a** = inclinação (taxa de variação), **b** = onde corta o eixo y.
- a > 0: crescente; a < 0: decrescente.

> [!formula] Afim
> **f(x) = ax + b**  ·  raiz: x = −b/a
> a = Δy / Δx (quanto y muda quando x aumenta 1)

### Função quadrática — f(x) = ax² + bx + c

- Gráfico: parábola. a > 0 → "boca para cima" (tem mínimo); a < 0 → "boca para baixo" (tem máximo).
- **c** = onde corta o eixo y (f(0) = c).

> [!formula] Raízes (Bhaskara)
> **Δ = b² − 4ac**  ·  **x = (−b ± √Δ) / 2a**
> Δ > 0: duas raízes · Δ = 0: uma · Δ < 0: nenhuma real
> Soma das raízes = −b/a  ·  Produto = c/a

> [!formula] Vértice e imagem
> **x_v = −b / 2a**  ·  **y_v = −Δ / 4a** (ou calcule f(x_v))
> a < 0 → imagem (−∞, y_v]  ·  a > 0 → imagem [y_v, +∞)
> O vértice fica no **meio** das raízes: x_v = (x₁ + x₂) / 2

### Função exponencial — f(x) = aˣ

- a > 1: crescente; 0 < a < 1: decrescente. Sempre positiva.
- Para resolver equação: **iguale as bases**.

> [!formula] Equação exponencial
> **aˣ = aʸ ⇔ x = y**
> Truque: 4ˣ = (2ˣ)². Troque 2ˣ por y e resolva a equação do 2º grau.

### Logaritmo

> [!formula] Definição e propriedades
> **log_a b = x ⇔ aˣ = b**  (b > 0, a > 0, a ≠ 1)
> log(m · n) = log m + log n  ·  log(m/n) = log m − log n  ·  log mᵏ = k · log m
> log_a a = 1  ·  log_a 1 = 0

### Domínio (onde a função "existe")

> [!formula] Restrições
> Denominador **≠ 0**  ·  Raiz de índice par: radicando **≥ 0**  ·  Logaritmando **> 0**
> Raiz par **no denominador**: radicando **> 0**

### Função modular e inversa

- |x| = x se x ≥ 0; −x se x < 0. Gráfico de |x| é um "V".
- Inversa: troque x por y e isole y. Domínio de uma vira imagem da outra.

## Exemplos resolvidos

> [!exemplo] Exemplo 1 — quadrática completa
> f(x) = −x² + 6x − 5. Raízes, vértice e imagem?
> Δ = 36 − 20 = 16 → x = (−6 ± 4)/(−2) → **x = 1 ou x = 5**.
> x_v = −6/(−2) = 3 · y_v = f(3) = −9 + 18 − 5 = **4**.
> a < 0 → **imagem (−∞, 4]**.

> [!exemplo] Exemplo 2 — exponencial com troca de variável
> 4ˣ − 6 · 2ˣ + 8 = 0.
> y = 2ˣ → y² − 6y + 8 = 0 → y = 2 ou y = 4 → 2ˣ = 2 (x = 1) ou 2ˣ = 4 (x = 2).
> **Soma das raízes = 3.**

> [!exemplo] Exemplo 3 — logaritmo
> log₂(x − 1) = 3 → x − 1 = 2³ = 8 → **x = 9** (confere: 9 − 1 > 0).

> [!exemplo] Exemplo 4 — domínio
> f(x) = √(x − 2) / (x − 5). Precisa x − 2 ≥ 0 e x − 5 ≠ 0.
> **D = {x ∈ ℝ | x ≥ 2 e x ≠ 5}.**

## Pegadinhas

> [!pegadinha] Sinal do a
> Imagem e máximo/mínimo dependem do sinal de **a**. Antes de responder, olhe se a parábola é para cima ou para baixo.

> [!pegadinha] Esquecer a condição de existência
> Em log e raiz, depois de resolver, **confira** se a resposta respeita o domínio. Às vezes uma raiz "sobra".

> [!pegadinha] −x² não é (−x)²
> Em f(x) = −x² + …, com x = 3: −3² = −9 (o expoente vem antes do sinal).

> [!dica]
> Se a questão dá duas raízes, o vértice está no meio delas. Ex.: raízes 0 e 4 → x_v = 2. Economiza a fórmula.

> [!resumo] Resumo de 1 minuto
> - Afim: reta, a = inclinação, raiz −b/a
> - Quadrática: Δ = b² − 4ac; x_v = −b/2a; y_v = −Δ/4a
> - Exponencial: iguale as bases; 4ˣ = (2ˣ)²
> - Log: log_a b = x ⇔ aˣ = b
> - Domínio: denominador ≠ 0, raiz par ≥ 0, log > 0

## Exercícios

**1.** Uma função afim é dada por f(x) = 3x + b e sabe-se que f(2) = 10. O valor de f(0) é:

(A) 2
(B) 4
(C) 6
(D) 10

**2.** O vértice da parábola f(x) = x² − 4x + 3 é o ponto:

(A) (2, −1)
(B) (−2, 15)
(C) (4, 3)
(D) (1, 0)

**3.** A imagem da função f(x) = −x² + 2x + 3 é:

(A) [4, +∞)
(B) (−∞, 3]
(C) (−∞, 4]
(D) ℝ

**4.** A solução da equação 2ˣ⁺¹ = 32 é:

(A) 3
(B) 5
(C) 16
(D) 4

**5.** O valor de log₃ 81 + log₂ 8 é:

(A) 7
(B) 12
(C) 5
(D) 1

**6.** O domínio da função f(x) = 1 / √(6 − 2x) é:

(A) x ≤ 3
(B) x > 3
(C) x ≠ 3
(D) x < 3

**7.** Uma pequena fábrica tem custo C(x) = 500 + 20x e receita R(x) = 45x, em reais, para x peças. O número de peças em que o lucro é zero (ponto de equilíbrio) é:

(A) 10
(B) 20
(C) 25
(D) 45

## Gabarito

**1. B** — 3 · 2 + b = 10 → b = 4; f(0) = b = 4.

**2. A** — x_v = 4/2 = 2; f(2) = 4 − 8 + 3 = −1.

**3. C** — a = −1 < 0; x_v = 1; f(1) = −1 + 2 + 3 = 4 → (−∞, 4].

**4. D** — 32 = 2⁵ → x + 1 = 5 → x = 4.

**5. A** — 81 = 3⁴ e 8 = 2³ → 4 + 3 = 7.

**6. D** — raiz par no denominador: 6 − 2x > 0 → x < 3.

**7. B** — lucro = R − C = 25x − 500 = 0 → x = 20.

Funções é o coração da Matemática da prova. Go, Julls!
