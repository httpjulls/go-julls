/**
 * Formulário — esqueleto editável (Markdown) por tópico de Matemática e Física.
 * É ponto de partida: revise, corrija e complete com o seu material.
 */
import type { Note } from '../db/types';
import { SEED_STAMP } from './seed';

const F: Record<string, [string, string]> = {
  // ---------- MATEMÁTICA ----------
  'mat-porcentagem': ['Porcentagem, razões e juros simples', `
- x% de A = (x/100)·A
- Aumento de i%: A·(1 + i) · Desconto de i%: A·(1 − i)
- Aumentos/descontos sucessivos: **multiplique os fatores** (ex.: −20% e −20% → 0,8·0,8 = 0,64)
- Regra de três direta: a/b = c/x · inversa: a·b = c·x
- Juros simples: J = C·i·t · Montante M = C·(1 + i·t)
`],
  'mat-funcoes': ['Funções', `
- **Afim** f(x) = ax + b · raiz x = −b/a · a > 0 crescente
- **Quadrática** f(x) = ax² + bx + c · Δ = b² − 4ac · x = (−b ± √Δ)/2a
  - Vértice: xv = −b/2a · yv = −Δ/4a · soma das raízes −b/a · produto c/a
  - Imagem: a < 0 → (−∞, yv] · a > 0 → [yv, +∞)
- **Exponencial** f(x) = aˣ (a > 0, a ≠ 1) · aˣ = aʸ ⇔ x = y
  - Truque: 4ˣ = (2ˣ)² → substitua y = 2ˣ
- **Logaritmo** logₐ b = x ⇔ aˣ = b · log(ab) = log a + log b · log(a/b) = log a − log b · log aⁿ = n·log a
  - Mudança de base: logₐ b = log b / log a
- **Modular** |x| = x se x ≥ 0; −x se x < 0
- **Inversa**: troque x e y e isole y · domínio ↔ imagem
- **Domínio**: denominador ≠ 0 · radicando de raiz par ≥ 0 · logaritmando > 0
`],
  'mat-probabilidade': ['Probabilidade', `
- P(A) = casos favoráveis / casos possíveis
- P(A ou B) = P(A) + P(B) − P(A e B)
- Complementar: P(pelo menos um) = 1 − P(nenhum)
- Independentes: P(A e B) = P(A)·P(B)
- Condicional: P(A|B) = P(A e B)/P(B)
`],
  'mat-estatistica': ['Estatística básica', `
- Média = soma / n · se a média de n números é M, a soma é n·M
- Mediana: valor central (ordenar!) · Moda: mais frequente
- Variância = média dos (xᵢ − média)² · Desvio padrão = √variância
`],
  'mat-geo-plana': ['Geometria plana', `
- Áreas: retângulo b·h · triângulo b·h/2 · trapézio (B + b)·h/2 · losango D·d/2 · círculo πr²
- Comprimento da circunferência 2πr
- Pitágoras: a² = b² + c²
- Semelhança: razão de lados k → razão de áreas k²
- Tales: retas paralelas cortadas por transversais → segmentos proporcionais
- Triângulo equilátero: h = l√3/2 · área l²√3/4
- Soma dos ângulos internos de polígono: (n − 2)·180°
`],
  'mat-geo-espacial': ['Geometria espacial', `
- Paralelepípedo: V = abc · área total 2(ab + ac + bc) · diagonal √(a² + b² + c²)
- Cubo: V = a³ · área 6a² · diagonal a√3
- Prisma: V = Ab·h · Cilindro: V = πr²h · área lateral 2πrh
- Pirâmide e cone: V = Ab·h/3 · Esfera: V = 4πr³/3 · área 4πr²
- Euler: V − A + F = 2
`],
  'mat-trigonometria': ['Trigonometria', `
- sen² x + cos² x = 1 · tg x = sen x / cos x
- Sinais por quadrante: 1º todos +, 2º só sen +, 3º só tg +, 4º só cos +
- Ângulos notáveis: sen 30° = 1/2 · sen 45° = √2/2 · sen 60° = √3/2
- Lei dos senos: a/sen A = b/sen B = 2R · Lei dos cossenos: a² = b² + c² − 2bc·cos A
- π rad = 180°
`],
  'mat-pa-pg': ['PA e PG', `
- PA: aₙ = a₁ + (n − 1)r · Sₙ = (a₁ + aₙ)·n/2
- PG: aₙ = a₁·qⁿ⁻¹ · Sₙ = a₁(qⁿ − 1)/(q − 1) · soma infinita (|q| < 1) = a₁/(1 − q)
`],
  'mat-combinatoria': ['Análise combinatória', `
- Princípio fundamental da contagem: multiplique as possibilidades de cada etapa
- Permutação Pₙ = n! · com repetição n!/(a!·b!…)
- Arranjo A(n,p) = n!/(n − p)! (ordem importa)
- Combinação C(n,p) = n!/(p!(n − p)!) (ordem não importa)
- Binômio: termo geral T = C(n,p)·aⁿ⁻ᵖ·bᵖ
`],
  'mat-numeros-complexos': ['Conjuntos numéricos e complexos', `
- Potências: aᵐ·aⁿ = aᵐ⁺ⁿ · aᵐ/aⁿ = aᵐ⁻ⁿ · a⁻ⁿ = 1/aⁿ
- z = a + bi · i² = −1 · conjugado a − bi · |z| = √(a² + b²)
- Forma trigonométrica: z = |z|(cos θ + i sen θ)
`],
  'mat-matrizes': ['Matrizes e determinantes', `
- det 2×2: ad − bc · det 3×3: regra de Sarrus
- A·A⁻¹ = I · A⁻¹ existe ⇔ det A ≠ 0
`],
  'mat-sistemas': ['Sistemas lineares', `
- det ≠ 0 → possível e determinado (solução única)
- det = 0 → possível indeterminado ou impossível (escalonar para decidir)
`],
  'mat-geo-analitica': ['Geometria analítica', `
- Distância: d = √((x₂ − x₁)² + (y₂ − y₁)²) · ponto médio ((x₁ + x₂)/2, (y₁ + y₂)/2)
- Reta: y = mx + n · m = Δy/Δx · paralelas m₁ = m₂ · perpendiculares m₁·m₂ = −1
- Circunferência: (x − a)² + (y − b)² = r²
`],
  'mat-polinomios': ['Polinômios', `
- Grau n → n raízes complexas (teorema fundamental)
- Girard (grau 2): soma −b/a, produto c/a · (grau 3): soma −b/a, produto −d/a
- Resto da divisão por (x − a) = P(a)
`],
  // ---------- FÍSICA ----------
  'fis-cinematica': ['Cinemática', `
- Velocidade média v = Δs/Δt · aceleração a = Δv/Δt
- MU: s = s₀ + vt
- MUV: v = v₀ + at · s = s₀ + v₀t + at²/2 · Torricelli v² = v₀² + 2aΔs
- Unidades: km/h ÷ 3,6 = m/s
`],
  'fis-newton': ['Leis de Newton', `
- 1ª inércia · 2ª F_res = m·a · 3ª ação e reação (corpos diferentes)
- Peso P = m·g · Atrito F_at = μ·N
- Elevador: subindo acelerado N = m(g + a) · velocidade constante N = mg · freando na subida N = m(g − a)
- Centrípeta: F_c = m·v²/R
`],
  'fis-energia': ['Trabalho, energia e potência', `
- Trabalho τ = F·d·cos θ · Teorema: τ_total = ΔEc
- Ec = mv²/2 · Ep = mgh · Ep elástica = kx²/2
- Conservação (sem atrito): Ec + Ep = constante
- Potência P = τ/Δt = F·v
`],
  'fis-momento': ['Momento linear e colisões', `
- Q = m·v · Impulso I = F·Δt = ΔQ
- Sistema isolado: Q_antes = Q_depois
- Coeficiente de restituição e = v_afast / v_aprox (1 elástica, 0 inelástica)
`],
  'fis-gravitacao': ['Gravitação', `
- F = G·M·m/d² · g = GM/R²
- Órbita circular: v = √(GM/r)
- Projétil: horizontal MU, vertical MUV (a = −g)
`],
  'fis-estatica': ['Estática', `
- Equilíbrio: ΣF = 0 e ΣM = 0 · Momento M = F·d (braço)
`],
  'fis-pressao': ['Densidade e pressão', `
- Densidade ρ = m/V · Pressão p = F/A
- 1 atm ≈ 10⁵ Pa ≈ 10 m de coluna de água
`],
  'fis-hidrostatica': ['Hidrostática', `
- Stevin: p = p₀ + ρgh · mesma altura no mesmo líquido em repouso → mesma pressão
- Vasos comunicantes com 2 líquidos: ρ₁h₁ = ρ₂h₂ (a partir da interface)
- Pascal: F₁/A₁ = F₂/A₂
- Arquimedes: E = ρ_líq·V_sub·g · flutua: E = P
- Peso aparente = P − E
`],
  'fis-gases': ['Gases perfeitos', `
- pV = nRT · p₁V₁/T₁ = p₂V₂/T₂ (T em kelvin!)
- Isotérmica pV = cte · isobárica V/T = cte · isométrica p/T = cte
`],
  'fis-termometria': ['Temperatura, dilatação, calorimetria', `
- T(K) = θ(°C) + 273 · θC/5 = (θF − 32)/9
- Dilatação linear ΔL = L₀·α·Δθ · superficial β = 2α · volumétrica γ = 3α
- Calor sensível Q = m·c·Δθ · latente Q = m·L · equilíbrio: ΣQ = 0
`],
  'fis-termodinamica': ['1ª lei da termodinâmica', `
- ΔU = Q − W (W = trabalho realizado PELO gás)
- Isotérmica: ΔU = 0 → Q = W (compressão: W < 0 e Q < 0)
- Isométrica: W = 0 → ΔU = Q · Isobárica: W = p·ΔV · Adiabática: Q = 0 → ΔU = −W
`],
  'fis-ondas': ['Ondas', `
- v = λ·f · T = 1/f
- Na refração a frequência NÃO muda; muda v e λ
- Corda: v = √(T/μ) · estacionária: λ = 2L/n
- Uma oitava acima = frequência dobrada
`],
  'fis-som': ['Som', `
- Altura (grave/agudo) ↔ frequência · intensidade ↔ amplitude · timbre ↔ forma da onda
- Som não se propaga no vácuo · v_som no ar ≈ 340 m/s
`],
  'fis-optica': ['Óptica geométrica', `
- Reflexão: ângulo de incidência = ângulo de reflexão
- Snell: n₁·sen θ₁ = n₂·sen θ₂ · n = c/v → maior n, menor ângulo com a normal
- Reflexão total: do meio mais refringente para o menos, θ > ângulo limite (sen L = n₂/n₁)
- Espelhos/lentes (Gauss): 1/f = 1/p + 1/p' · A = −p'/p · espelho côncavo f = R/2
- Vergência V = 1/f (dioptrias, f em metros)
`],
  'fis-eletrostatica': ['Eletrostática', `
- Coulomb: F = k·|q₁q₂|/d² · k = 9·10⁹ N·m²/C²
- Campo E = F/q = kQ/d² · Potencial V = kQ/d
- Campo uniforme: U = E·d · o potencial DIMINUI no sentido das linhas de campo
- Trabalho τ = q·(V_A − V_B)
`],
  'fis-circuitos': ['Circuitos elétricos', `
- Ohm: U = R·i · Potência P = U·i = R·i² = U²/R · Energia E = P·Δt
- Série: R_eq = R₁ + R₂ + … (mesma corrente)
- Paralelo: 1/R_eq = 1/R₁ + 1/R₂ (mesma tensão) · dois iguais: R/2
- Amperímetro ideal: em série, R = 0 · Voltímetro ideal: em paralelo, R → ∞
- Gerador: U = ε − r·i
`],
  'fis-magnetismo': ['Magnetismo', `
- Força sobre carga: F = |q|·v·B·sen θ (regra da mão)
- Polos iguais se repelem · o norte da bússola aponta para o polo sul magnético da Terra
`],
  'fis-grandezas': ['Grandezas e unidades', `
- SI: m, kg, s, A, K, mol, cd
- Prefixos: k = 10³ · M = 10⁶ · m = 10⁻³ · μ = 10⁻⁶ · n = 10⁻⁹
- Análise dimensional: os dois lados da equação têm as mesmas unidades
`],
};

export function seedFormulaNotes(): Note[] {
  return Object.entries(F).map(([topicId, [title, body]]) => ({
    id: `formula-${topicId}`,
    kind: 'formula' as const,
    subject: topicId.startsWith('mat') ? ('mat' as const) : ('fis' as const),
    topicId,
    title,
    body: body.trim() + '\n\n> Esqueleto gerado pelo app: revise e complete.',
    attachments: [],
    updated_at: SEED_STAMP,
    device_id: 'seed',
  }));
}
