---
titulo: Trigonometria
subtitulo: Seno, cosseno, tangente, ciclo, quadrantes e leis dos senos e cossenos
disciplina: Matemática
frequencia: 3
tempo: 50 min
topicos: mat-trigonometria
---

## Por que isso importa

Trigonometria caiu no caderno 2026.2 (Q33, arco no segundo quadrante) e é usada em Física (plano inclinado, decomposição de forças, Snell). Cada questão de Matemática vale **2,5 pontos** (edital, item 8.1.2). Com a tabela dos ângulos notáveis e os sinais por quadrante, dá para resolver quase tudo de cabeça.

## O essencial

### No triângulo retângulo

> [!formula] Razões trigonométricas
> **sen θ = cateto oposto / hipotenusa**
> **cos θ = cateto adjacente / hipotenusa**
> **tg θ = cateto oposto / cateto adjacente = sen θ / cos θ**

### Ângulos notáveis

|  | 30° | 45° | 60° |
|---|---|---|---|
| sen | 1/2 | √2/2 | √3/2 |
| cos | √3/2 | √2/2 | 1/2 |
| tg | √3/3 | 1 | √3 |

- Truque: o seno sobe (1/2, √2/2, √3/2) e o cosseno é o mesmo ao contrário.
- 0°: sen 0, cos 1 · 90°: sen 1, cos 0.

### Radianos

> [!formula] Conversão
> **π rad = 180°**  ·  graus → rad: × π/180  ·  rad → graus: × 180/π
> 30° = π/6 · 45° = π/4 · 60° = π/3 · 90° = π/2 · 120° = 2π/3 · 135° = 3π/4 · 150° = 5π/6

### Ciclo trigonométrico e sinais

| Quadrante | Intervalo | Positivos |
|---|---|---|
| 1º | 0° a 90° | sen, cos, tg |
| 2º | 90° a 180° | **só sen** |
| 3º | 180° a 270° | **só tg** |
| 4º | 270° a 360° | **só cos** |

- **Redução ao 1º quadrante:** sen(180° − x) = sen x · cos(180° − x) = −cos x.
  Ex.: cos 120° = −cos 60° = −1/2.

### Relação fundamental

> [!formula] Relação fundamental
> **sen² x + cos² x = 1**
> Achou o seno? cos = ±√(1 − sen²); o sinal vem do quadrante.

### Triângulos quaisquer

> [!formula] Leis dos senos e dos cossenos
> **a / sen A = b / sen B = c / sen C**
> **a² = b² + c² − 2 · b · c · cos A**

## Exemplos resolvidos

> [!exemplo] Exemplo 1 — rampa
> Rampa de 10 m inclinada 30°: altura = 10 · sen 30° = **5 m**.

> [!exemplo] Exemplo 2 — quadrante
> x no 2º quadrante com sen x = 4/5.
> cos² x = 1 − 16/25 = 9/25 → cos x = **−3/5** (no 2º quadrante o cosseno é negativo).
> tg x = (4/5)/(−3/5) = **−4/3**.

> [!exemplo] Exemplo 3 — conversão
> 150° = 150 · π/180 = **5π/6 rad**.

> [!exemplo] Exemplo 4 — lei dos cossenos
> Lados 3 e 5 formando 120°: a² = 9 + 25 − 2 · 3 · 5 · (−1/2) = 34 + 15 = 49 → **a = 7**.

## Pegadinhas

> [!pegadinha] Esquecer o sinal do quadrante
> sen² + cos² = 1 dá o valor **absoluto**. O sinal vem do quadrante: no 2º, cosseno e tangente são negativos.

> [!pegadinha] Cosseno de ângulo obtuso
> cos 120° = −1/2. Na lei dos cossenos, o "menos com menos" vira soma: o lado oposto ao ângulo obtuso é o maior.

> [!pegadinha] Calculadora mental em graus
> A prova pode dar o ângulo em radianos. Converta (π = 180°) antes de consultar a tabela.

> [!dica]
> Triângulo 3-4-5 é um atalho: se sen = 3/5, então cos = 4/5 (no 1º quadrante). Com 5-12-13 também.

> [!resumo] Resumo de 1 minuto
> - sen = op/hip; cos = adj/hip; tg = op/adj
> - Tabela 30/45/60 de cor
> - π rad = 180°
> - Sinais: 1º todos, 2º sen, 3º tg, 4º cos
> - sen² + cos² = 1; lei dos cossenos a² = b² + c² − 2bc cos A

## Exercícios

**1.** Uma escada de 6 m está apoiada num muro e forma 60° com o chão. A altura que ela alcança no muro é:

(A) 3 m
(B) 3√3 m
(C) 6√3 m
(D) 3√2 m

**2.** O valor de sen 30° + cos 60° é:

(A) 1
(B) 1/2
(C) √3
(D) 0

**3.** O arco de 3π/4 rad corresponde a:

(A) 45°
(B) 270°
(C) 135°
(D) 120°

**4.** Sabendo que x está no 4º quadrante e que cos x = 5/13, o valor de sen x é:

(A) 12/13
(B) −5/12
(C) −12/5
(D) −12/13

**5.** O valor de tg 45° é:

(A) 0
(B) 1
(C) √2/2
(D) √3

**6.** O valor de cos 120° é:

(A) 1/2
(B) −√3/2
(C) √3/2
(D) −1/2

**7.** Dois lados de um triângulo medem 5 cm e 8 cm e formam entre si um ângulo de 60°. O terceiro lado mede:

(A) 7 cm
(B) √89 cm
(C) 13 cm
(D) √129 cm

## Gabarito

**1. B** — altura = 6 · sen 60° = 6 · √3/2 = 3√3 m.

**2. A** — 1/2 + 1/2 = 1.

**3. C** — (3/4) · 180° = 135°.

**4. D** — sen² x = 1 − 25/169 = 144/169 → |sen x| = 12/13; no 4º quadrante o seno é negativo.

**5. B** — tg 45° = 1.

**6. D** — cos 120° = −cos 60° = −1/2.

**7. A** — a² = 25 + 64 − 2 · 5 · 8 · 1/2 = 89 − 40 = 49 → a = 7.

Tabela na cabeça, sinal no quadrante. Go, Julls!
