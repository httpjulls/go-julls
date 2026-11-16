/**
 * Mapa de matérias — seed inicial.
 * Tópicos conferidos contra docs/ConteudoProgramaticoDasProvas_2027_1.pdf.
 * Frequência (1–5) = estimativa editável. Onde há referência "C26.1 Qn" / "C26.2 Qn", o tópico
 * apareceu nos cadernos 2026.1 / 2026.2; as demais são estimativa a partir do programa.
 */
import { SUBJECT_NAMES, SUBJECT_POINTS, type SubjectId } from '../core/exam';
import type { Subject, Topic } from '../db/types';

export const SEED_STAMP = '1970-01-01T00:00:00.000Z';

type T = [slug: string, name: string, freq: number, source?: string];

const MAP: Record<SubjectId, T[]> = {
  mat: [
    ['logica-conjuntos', 'Noções de lógica e conjuntos', 2],
    ['numeros-complexos', 'Conjuntos numéricos e números complexos', 3, 'C26.1 Q31 (potências)'],
    ['funcoes', 'Funções (afim, quadrática, exponencial, logarítmica, trigonométrica, modular, inversa)', 5, 'C26.1 Q34; C26.2 Q32, Q36'],
    ['equacoes', 'Equações, inequações e sistemas', 3],
    ['porcentagem', 'Regra de três, razões, proporções, porcentagem e juros simples', 4, 'C26.1 Q32'],
    ['polinomios', 'Polinômios (raízes, relações, teorema fundamental)', 2],
    ['pa-pg', 'Sequências: PA e PG', 2],
    ['combinatoria', 'Análise combinatória e binômio de Newton', 2],
    ['probabilidade', 'Probabilidade', 5, 'C26.1 Q33; C26.2 Q35'],
    ['estatistica', 'Estatística básica (posição, dispersão, gráficos)', 3, 'C26.2 Q31'],
    ['geo-plana', 'Geometria plana (Tales, semelhança, relações métricas, áreas)', 4, 'C26.1 Q35'],
    ['geo-espacial', 'Geometria espacial (poliedros, prismas, pirâmides, cilindro, cone, esfera)', 3, 'C26.2 Q34'],
    ['trigonometria', 'Trigonometria (arcos, ângulos, relações)', 3, 'C26.2 Q33'],
    ['vetores', 'Vetores no R² e R³ (produto escalar, vetorial e misto)', 1],
    ['geo-analitica', 'Geometria analítica plana e espacial (retas, cônicas, planos, esferas)', 2],
    ['matrizes', 'Matrizes e determinantes (ordem 2 e 3, inversa)', 2],
    ['sistemas', 'Sistemas lineares 2×2 e 3×3', 2],
  ],
  fis: [
    ['grandezas', 'Grandezas, unidades SI e análise dimensional', 1],
    ['cinematica', 'Cinemática escalar e vetorial', 4, 'C26.2 Q18'],
    ['newton', 'Leis de Newton e composição de forças', 4, 'C26.1 Q15; C26.2 Q13'],
    ['momento', 'Momento linear, impulso e colisões', 2],
    ['gravitacao', 'Gravitação, queda livre, projéteis e órbitas', 2],
    ['energia', 'Trabalho, energia e potência', 3],
    ['estatica', 'Centro de massa e estática do corpo rígido', 2],
    ['pressao', 'Massa específica (densidade) e pressão', 2],
    ['hidrostatica', 'Hidrostática (Stevin, Pascal, Arquimedes, flutuação)', 5, 'C26.1 Q18; C26.2 Q14'],
    ['gases', 'Gases perfeitos (isotérmico, isobárico, isométrico)', 3, 'C26.1 Q14'],
    ['termometria', 'Temperatura, dilatação e calorimetria', 3],
    ['termodinamica', '1ª lei da termodinâmica', 3, 'C26.1 Q14'],
    ['ondas', 'Ondas e superposição (estacionárias, reflexão, refração)', 4, 'C26.2 Q17'],
    ['som', 'Som', 3, 'C26.2 Q17'],
    ['optica', 'Óptica geométrica (reflexão, refração, espelhos, lentes)', 4, 'C26.1 Q17'],
    ['eletrostatica', 'Eletrostática (Coulomb, campo e potencial elétrico)', 4, 'C26.2 Q16'],
    ['circuitos', 'Circuitos elétricos (Ohm, associações, potência, medidores)', 5, 'C26.1 Q16; C26.2 Q15'],
    ['magnetismo', 'Noções de magnetismo (força magnética, ímãs, bússola)', 2],
  ],
  red: [
    ['estrutura', 'Estrutura dissertativo-argumentativa (introdução, desenvolvimento, conclusão)', 5],
    ['tese', 'Tese e argumentação (aprofundamento dos argumentos)', 5, 'Edital 5.3.1 c'],
    ['repertorio', 'Repertório sociocultural', 4],
    ['coesao', 'Coesão e conectivos', 5, 'Edital 5.3.1 b'],
    ['paragrafacao', 'Paragrafação e pontuação', 5, 'Edital 5.3.1 b'],
    ['gramatica', 'Concordância, regência, crase e colocação pronominal', 5, 'Edital 5.3.1 a'],
    ['registro', 'Registro formal e ortografia', 4, 'Edital 5.3.1 a'],
    ['tema', 'Adequação ao tema e ao tipo textual (fuga = zero)', 5, 'Edital 8.2.1 b'],
    ['intervencao', 'Proposta de solução na conclusão (não é critério explícito do edital CEDERJ)', 1],
    ['linhas', 'Controle de 20 a 25 linhas', 5, 'Edital 5.3.2 e 8.2.1 a'],
  ],
  por: [
    ['interpretacao', 'Compreensão e interpretação de texto', 5, 'C26.1 Q01, Q06; C26.2 Q01'],
    ['tipologia', 'Tipologia textual e gêneros', 3],
    ['textualidade', 'Coesão, coerência e estrutura do parágrafo', 4, 'C26.1 Q05; C26.2 Q05'],
    ['discurso', 'Discurso direto, indireto e indireto livre', 2],
    ['norma', 'Língua falada e escrita, níveis de linguagem, ortografia', 2],
    ['morfossintaxe', 'Morfossintaxe (formação de palavras, classes, sintaxe, concordância, regência, pontuação)', 4, 'C26.1 Q02; C26.2 Q02, Q04'],
    ['semantica', 'Semântica, estilística e figuras de linguagem', 3, 'C26.1 Q03, Q04'],
    ['teoria-lit', 'Teoria da literatura e gêneros literários', 2],
    ['barroco-arcadismo', 'Barroco e Arcadismo', 1],
    ['romantismo', 'Romantismo', 2],
    ['realismo', 'Realismo, Naturalismo, Parnasianismo e Simbolismo', 2],
    ['modernismo', 'Modernismo e poesia de 1945', 3],
    ['contemporanea', 'Literatura brasileira contemporânea', 3, 'C26.1 Q01 (Eliane Brum); C26.2 Q01 (Ana Maria Gonçalves)'],
  ],
  qui: [
    ['materia', 'Matéria, átomo, substâncias e misturas', 3],
    ['compostos', 'Átomos, moléculas, íons e nomenclatura', 3, 'C26.1 Q42'],
    ['estequiometria', 'Mol, fórmulas e estequiometria', 4],
    ['gases', 'Estado gasoso', 2],
    ['termoquimica', 'Termoquímica', 3, 'C26.2 Q41 (combustão)'],
    ['tabela', 'Estrutura eletrônica e tabela periódica (propriedades periódicas)', 3, 'C26.1 Q37, Q42'],
    ['ligacoes', 'Ligações químicas, geometria e forças intermoleculares', 3],
    ['estados', 'Estados líquido e sólido, mudanças de estado', 1],
    ['solucoes', 'Água, soluções e concentração', 4, 'C26.2 Q42'],
    ['coligativas', 'Propriedades coligativas e coloides', 1],
    ['redox', 'Reações redox e eletroquímica', 3],
    ['cinetica', 'Cinética química', 2],
    ['equilibrio', 'Equilíbrio químico (Le Chatelier)', 2, 'C26.1 Q39 (Haber)'],
    ['acidos-bases', 'Ácidos, bases e pH', 3, 'C26.1 Q38'],
    ['descritiva', 'Metais, não metais e elementos (descritiva)', 2, 'C26.2 Q37, Q39'],
    ['organica', 'Química orgânica: cadeias, funções e nomenclatura', 4, 'C26.2 Q38, Q40'],
    ['isomeria', 'Isomeria e reações orgânicas', 2],
    ['polimeros', 'Polímeros', 1],
  ],
  bio: [
    ['celula', 'Célula e bioquímica', 4, 'C26.2 Q07'],
    ['tecidos', 'Tecidos animais e vegetais', 2, 'C26.2 Q08'],
    ['classificacao', 'Seres vivos e classificação (vírus a animais)', 3, 'C26.2 Q12'],
    ['fisiologia', 'Fisiologia humana e animal', 3, 'C26.2 Q10'],
    ['vegetal', 'Fisiologia vegetal', 2],
    ['genetica', 'Genética (Mendel, heredogramas, herança ligada ao sexo)', 4, 'C26.2 Q11'],
    ['biotec', 'Biologia molecular e biotecnologia', 2, 'C26.1 Q08'],
    ['evolucao', 'Evolução', 2],
    ['ecologia', 'Ecologia e ciclos biogeoquímicos', 3, 'C26.2 Q12'],
    ['saude', 'Saúde pública, doenças e saneamento', 3, 'C26.2 Q09'],
  ],
  geo: [
    ['natureza', 'Produção do espaço: relevo, clima, vegetação e águas', 3, 'C26.2 Q19'],
    ['mundial', 'Espaço mundial: globalização, blocos e geopolítica', 3, 'C26.2 Q22'],
    ['industria', 'Industrialização (mundo e Brasil)', 3, 'C26.2 Q23'],
    ['urbano', 'Espaço urbano e urbanização', 3, 'C26.1 Q20, Q21'],
    ['agrario', 'Espaço agrário', 3, 'C26.1 Q24; C26.2 Q24'],
    ['populacao', 'População e migrações', 2, 'C26.1 Q23'],
    ['ambiente', 'Meio ambiente e recursos naturais', 3],
    ['brasil', 'Espaço brasileiro: regionalização e integração', 2],
  ],
  his: [
    ['moderna', 'Época Moderna: Renascimento, reformas, absolutismo, mercantilismo', 3, 'C26.2 Q25'],
    ['colonia', 'Brasil Colônia e revoltas coloniais', 3, 'C26.2 Q27'],
    ['revolucoes', 'Revoluções burguesas, Iluminismo e crise do Antigo Regime', 3, 'C26.2 Q26'],
    ['seculo19', 'Liberalismo, nacionalismo e América no século XIX', 2],
    ['imperio', 'Brasil Império', 2, 'C26.1 Q27'],
    ['liberal-crise', 'Sociedade liberal e sua crise (1870–1945): imperialismo, guerras, 1929', 2],
    ['republica', 'Brasil República até 1945 (Vargas)', 3, 'C26.1 Q27'],
    ['atuais', 'Sociedades atuais: Guerra Fria, descolonização, Oriente Médio', 3, 'C26.1 Q26, Q29'],
    ['brasil-1945', 'Brasil 1945–1985: populismo e ditadura', 3, 'C26.2 Q29'],
    ['nova-republica', 'Nova República e Constituição de 1988', 2],
    ['afro', 'História e cultura afro-brasileira', 3, 'C26.1 Q25; C26.2 Q28'],
    ['rio', 'Rio de Janeiro: reformas urbanas e história da cidade', 4, 'C26.1 Q25, Q30; C26.2 Q30'],
  ],
  lem: [
    ['leitura', 'Leitura e compreensão global de texto', 5, 'C26.1 Q43–45; C26.2 Q43–45'],
    ['vocabulario', 'Vocabulário fundamental e cognatos', 4],
    ['gramatica', 'Gramática básica para leitura (pronomes, conectivos, tempos verbais)', 3, 'C26.2 Q45'],
    ['generos', 'Gêneros textuais e intenção comunicativa', 2],
  ],
};

export const SUBJECT_ORDER: SubjectId[] = ['red', 'mat', 'fis', 'por', 'bio', 'qui', 'geo', 'his', 'lem'];

export function seedSubjects(): Subject[] {
  return SUBJECT_ORDER.map((id, i) => ({
    id,
    name: SUBJECT_NAMES[id],
    points: Math.round(SUBJECT_POINTS[id] * 10) / 10,
    order: i,
    updated_at: SEED_STAMP,
    device_id: 'seed',
  }));
}

export function seedTopics(): Topic[] {
  const out: Topic[] = [];
  for (const s of SUBJECT_ORDER) {
    MAP[s].forEach(([slug, name, frequency, source], i) => {
      out.push({
        id: `${s}-${slug}`,
        subject: s,
        name,
        frequency,
        status: 'pendente',
        order: i,
        active: true,
        source: source ?? 'estimativa pelo programa',
        updated_at: SEED_STAMP,
        device_id: 'seed',
      });
    });
  }
  return out;
}
