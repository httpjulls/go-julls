---
titulo: Circuitos elétricos
subtitulo: Lei de Ohm, associações, potência, geradores e medidores
disciplina: Física
frequencia: 5
tempo: 50 min
topicos: fis-circuitos
---

## Por que isso importa

Física é específica de Engenharia de Produção: **cada questão vale 2,5 pontos** (edital, item 8.1.2). Circuitos caiu nos dois últimos cadernos (2026.1 Q16 e 2026.2 Q15) — é o tópico de Física com melhor retorno por hora de estudo. E zerar Física elimina (item 6.3.1).

## O essencial

- **Corrente elétrica (i):** quantidade de carga que passa por segundo. Unidade: ampère (A). i = Q / Δt.
- **Tensão ou ddp (U):** “empurrão” que faz a corrente circular. Unidade: volt (V).
- **Resistência (R):** quanto o componente dificulta a passagem da corrente. Unidade: ohm (Ω).
- Num **resistor ôhmico**, U e i são proporcionais: dobrou a tensão, dobra a corrente.

> [!formula] 1ª Lei de Ohm
> **U = R · i**
> Isolando: i = U / R  ·  R = U / i

### Associação em série

Um resistor depois do outro, **num único caminho**.

- A **corrente é a mesma** em todos.
- A tensão se **divide**: o resistor maior fica com a maior tensão.
- Se um queima, o circuito inteiro para (pisca-pisca antigo).

> [!formula] Série
> **R_eq = R₁ + R₂ + R₃ + …**
> U_total = U₁ + U₂ + U₃

### Associação em paralelo

Resistores lado a lado, **ligados aos mesmos dois pontos**.

- A **tensão é a mesma** em todos.
- A corrente se **divide**: passa mais corrente pelo resistor menor.
- A R_eq é **menor que o menor** resistor da associação.
- É assim que a instalação de casa funciona: cada aparelho recebe 127 V ou 220 V.

> [!formula] Paralelo
> **1/R_eq = 1/R₁ + 1/R₂ + …**
> Dois resistores: R_eq = (R₁ · R₂) / (R₁ + R₂)  ·  n resistores iguais a R: R_eq = R / n

### Potência e energia

> [!formula] Potência elétrica
> **P = U · i = R · i² = U² / R**
> Energia: E = P · Δt  (em kWh: P em kW e Δt em horas)

- **Efeito Joule:** resistor transforma energia elétrica em calor (chuveiro, ferro, aquecedor).
- Mesmo resistor com o **dobro da tensão** → potência **4 vezes maior** (P = U²/R).

### Gerador real

Uma bateria tem resistência interna r: parte da energia fica “presa” dentro dela.

> [!formula] Gerador
> **U = ε − r · i**  ·  Circuito simples: **i = ε / (R + r)**
> Curto-circuito (R = 0): i_cc = ε / r

### Medidores ideais

| Aparelho | Como liga | Resistência ideal | Mede |
|---|---|---|---|
| Amperímetro | em **série** | zero | corrente |
| Voltímetro | em **paralelo** | infinita | tensão |

## Exemplos resolvidos

> [!exemplo] Exemplo 1 — três resistores iguais (estilo C26.1 Q16)
> Um resistor A está em série com o conjunto B ∥ C. Os três valem R e a bateria é ideal. Qual a razão U_A / U_B?
> B ∥ C = R/2. Toda a corrente i passa por A, então U_A = R · i. O conjunto B∥C recebe a mesma corrente i: U_B = (R/2) · i.
> **U_A / U_B = R·i / (R/2 · i) = 2.**

> [!exemplo] Exemplo 2 — chuveiro
> Chuveiro de 5 500 W ligado em 220 V, 15 min por dia, durante 30 dias.
> Corrente: i = P/U = 5 500/220 = **25 A**.
> Energia: 5,5 kW × 0,25 h × 30 = **41,25 kWh** no mês.

> [!exemplo] Exemplo 3 — gerador com resistência interna
> ε = 12 V, r = 1 Ω, ligado a R = 5 Ω.
> i = 12 / (5 + 1) = **2 A**. Tensão nos terminais: U = 12 − 1 · 2 = **10 V**.

## Pegadinhas

> [!pegadinha] “Mais resistores = mais resistência”?
> Só em série. Em **paralelo**, cada resistor novo é um caminho a mais: a R_eq **diminui** e a corrente total **aumenta**.

> [!pegadinha] Voltímetro em série
> Voltímetro ideal tem resistência infinita: ligado em série, ele **corta a corrente** e a lâmpada praticamente não acende.

> [!pegadinha] Potência e tensão
> P = U²/R: dobrar a tensão **quadruplica** a potência (não dobra). Por isso aparelho de 127 V queima em 220 V.

> [!dica]
> Dois resistores iguais em paralelo: R/2. Três iguais: R/3. Faça isso de cabeça antes de usar fórmula.

> [!resumo] Resumo de 1 minuto
> - **U = R · i** e **P = U · i**
> - Série: mesma corrente, R somam
> - Paralelo: mesma tensão, R_eq menor que o menor resistor
> - Gerador: U = ε − r · i
> - Amperímetro em série (R = 0), voltímetro em paralelo (R → ∞)

## Exercícios

**1.** Dois resistores, de 6 Ω e 3 Ω, são ligados em paralelo. A resistência equivalente é:

(A) 2 Ω
(B) 4,5 Ω
(C) 9 Ω
(D) 0,5 Ω

**2.** Uma lâmpada tem a inscrição “60 W – 120 V”. Funcionando normalmente, a corrente que a atravessa é:

(A) 0,25 A
(B) 0,5 A
(C) 2 A
(D) 7 200 A

**3.** Três resistores de 12 Ω cada são associados em paralelo e ligados a uma bateria ideal de 12 V. A corrente total fornecida pela bateria é:

(A) 1 A
(B) 3 A
(C) 4 A
(D) 36 A

**4.** Resistores de 2 Ω e 4 Ω, em série, estão ligados a uma fonte ideal de 12 V. A tensão no resistor de 4 Ω é:

(A) 4 V
(B) 6 V
(C) 12 V
(D) 8 V

**5.** Um resistor ôhmico passa a ser submetido ao dobro da tensão. A potência dissipada:

(A) dobra.
(B) quadruplica.
(C) cai pela metade.
(D) não se altera.

**6.** Um estudante liga, por engano, um voltímetro ideal em série com uma lâmpada e uma pilha. A lâmpada:

(A) acende normalmente.
(B) acende com brilho maior.
(C) queima o voltímetro.
(D) praticamente não acende.

**7.** Uma bateria tem fem de 9 V e resistência interna de 1 Ω. Se seus terminais forem ligados por um fio de resistência desprezível, a corrente será:

(A) 0
(B) 1 A
(C) 9 A
(D) infinita

**8.** Um aparelho de 2 000 W funciona 30 minutos por dia durante 30 dias. Com a tarifa de R$ 0,80 por kWh, o custo no mês é:

(A) R$ 2,40
(B) R$ 12,00
(C) R$ 24,00
(D) R$ 48,00

## Gabarito

**1. A** — (6 · 3)/(6 + 3) = 18/9 = 2 Ω.

**2. B** — i = P/U = 60/120 = 0,5 A.

**3. B** — R_eq = 12/3 = 4 Ω; i = 12/4 = 3 A.

**4. D** — R_eq = 6 Ω; i = 12/6 = 2 A; U = 4 · 2 = 8 V.

**5. B** — P = U²/R: (2U)² = 4U².

**6. D** — resistência do voltímetro ideal é infinita: a corrente fica praticamente nula.

**7. C** — curto-circuito: i = ε/r = 9/1 = 9 A (a resistência interna limita a corrente).

**8. C** — 2 kW × 0,5 h × 30 = 30 kWh; 30 × 0,80 = R$ 24,00.

Circuitos é ponto garantido de 2,5 em 2,5. Go, Julls!
