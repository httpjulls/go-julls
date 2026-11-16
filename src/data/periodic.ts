/** Tabela periódica (massas atômicas arredondadas, IUPAC). Para estudo — a prova traz a sua própria tabela. */
export type Cat = 'am' | 'at' | 'tr' | 'pt' | 'sm' | 'nm' | 'ha' | 'gn' | 'la' | 'ac';

export const CAT_LABEL: Record<Cat, string> = {
  am: 'Metais alcalinos',
  at: 'Metais alcalino-terrosos',
  tr: 'Metais de transição',
  pt: 'Outros metais (representativos)',
  sm: 'Semimetais',
  nm: 'Não metais',
  ha: 'Halogênios',
  gn: 'Gases nobres',
  la: 'Lantanídeos',
  ac: 'Actinídeos',
};

const RAW = `H|Hidrogênio|1.008|nm;He|Hélio|4.003|gn;Li|Lítio|6.94|am;Be|Berílio|9.012|at;B|Boro|10.81|sm;C|Carbono|12.011|nm;N|Nitrogênio|14.007|nm;O|Oxigênio|15.999|nm;F|Flúor|18.998|ha;Ne|Neônio|20.180|gn;Na|Sódio|22.990|am;Mg|Magnésio|24.305|at;Al|Alumínio|26.982|pt;Si|Silício|28.085|sm;P|Fósforo|30.974|nm;S|Enxofre|32.06|nm;Cl|Cloro|35.45|ha;Ar|Argônio|39.95|gn;K|Potássio|39.098|am;Ca|Cálcio|40.078|at;Sc|Escândio|44.956|tr;Ti|Titânio|47.867|tr;V|Vanádio|50.942|tr;Cr|Cromo|51.996|tr;Mn|Manganês|54.938|tr;Fe|Ferro|55.845|tr;Co|Cobalto|58.933|tr;Ni|Níquel|58.693|tr;Cu|Cobre|63.546|tr;Zn|Zinco|65.38|tr;Ga|Gálio|69.723|pt;Ge|Germânio|72.630|sm;As|Arsênio|74.922|sm;Se|Selênio|78.971|nm;Br|Bromo|79.904|ha;Kr|Criptônio|83.798|gn;Rb|Rubídio|85.468|am;Sr|Estrôncio|87.62|at;Y|Ítrio|88.906|tr;Zr|Zircônio|91.224|tr;Nb|Nióbio|92.906|tr;Mo|Molibdênio|95.95|tr;Tc|Tecnécio|98|tr;Ru|Rutênio|101.07|tr;Rh|Ródio|102.91|tr;Pd|Paládio|106.42|tr;Ag|Prata|107.87|tr;Cd|Cádmio|112.41|tr;In|Índio|114.82|pt;Sn|Estanho|118.71|pt;Sb|Antimônio|121.76|sm;Te|Telúrio|127.60|sm;I|Iodo|126.90|ha;Xe|Xenônio|131.29|gn;Cs|Césio|132.91|am;Ba|Bário|137.33|at;La|Lantânio|138.91|la;Ce|Cério|140.12|la;Pr|Praseodímio|140.91|la;Nd|Neodímio|144.24|la;Pm|Promécio|145|la;Sm|Samário|150.36|la;Eu|Európio|151.96|la;Gd|Gadolínio|157.25|la;Tb|Térbio|158.93|la;Dy|Disprósio|162.50|la;Ho|Hólmio|164.93|la;Er|Érbio|167.26|la;Tm|Túlio|168.93|la;Yb|Itérbio|173.05|la;Lu|Lutécio|174.97|la;Hf|Háfnio|178.49|tr;Ta|Tântalo|180.95|tr;W|Tungstênio|183.84|tr;Re|Rênio|186.21|tr;Os|Ósmio|190.23|tr;Ir|Irídio|192.22|tr;Pt|Platina|195.08|tr;Au|Ouro|196.97|tr;Hg|Mercúrio|200.59|tr;Tl|Tálio|204.38|pt;Pb|Chumbo|207.2|pt;Bi|Bismuto|208.98|pt;Po|Polônio|209|pt;At|Astato|210|ha;Rn|Radônio|222|gn;Fr|Frâncio|223|am;Ra|Rádio|226|at;Ac|Actínio|227|ac;Th|Tório|232.04|ac;Pa|Protactínio|231.04|ac;U|Urânio|238.03|ac;Np|Netúnio|237|ac;Pu|Plutônio|244|ac;Am|Amerício|243|ac;Cm|Cúrio|247|ac;Bk|Berquélio|247|ac;Cf|Califórnio|251|ac;Es|Einstênio|252|ac;Fm|Férmio|257|ac;Md|Mendelévio|258|ac;No|Nobélio|259|ac;Lr|Laurêncio|266|ac;Rf|Rutherfórdio|267|tr;Db|Dúbnio|268|tr;Sg|Seabórgio|269|tr;Bh|Bóhrio|270|tr;Hs|Hássio|277|tr;Mt|Meitnério|278|tr;Ds|Darmstádio|281|tr;Rg|Roentgênio|282|tr;Cn|Copernício|285|tr;Nh|Nihônio|286|pt;Fl|Fleróvio|289|pt;Mc|Moscóvio|290|pt;Lv|Livermório|293|pt;Ts|Tenesso|294|ha;Og|Oganessônio|294|gn`;

/** Eletronegatividade (Pauling) dos elementos mais cobrados. */
const EN: Record<string, number> = {
  H: 2.2, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.9, P: 2.19, S: 2.58, Cl: 3.16,
  K: 0.82, Ca: 1.0, Fe: 1.83, Cu: 1.9, Zn: 1.65, Br: 2.96, Ag: 1.93, I: 2.66, Ba: 0.89, Au: 2.54, Hg: 2.0, Pb: 2.33, Cs: 0.79,
};

export interface Element {
  z: number;
  symbol: string;
  name: string;
  mass: number;
  cat: Cat;
  group: number | null; // 1–18 (null para lantanídeos/actinídeos)
  period: number;
  row: number; // linha de exibição (1–7; 9 = lantanídeos; 10 = actinídeos)
  col: number; // coluna de exibição (1–18)
  en?: number;
}

function position(z: number): { group: number | null; period: number; row: number; col: number } {
  const g = (group: number, period: number) => ({ group, period, row: period, col: group });
  if (z === 1) return g(1, 1);
  if (z === 2) return g(18, 1);
  if (z <= 10) return z <= 4 ? g(z - 2, 2) : g(z + 8, 2);
  if (z <= 18) return z <= 12 ? g(z - 10, 3) : g(z, 3);
  if (z <= 36) return g(z - 18, 4);
  if (z <= 54) return g(z - 36, 5);
  if (z <= 56) return g(z - 54, 6);
  if (z <= 71) return { group: null, period: 6, row: 9, col: z - 57 + 3 };
  if (z <= 86) return g(z - 68, 6);
  if (z <= 88) return g(z - 86, 7);
  if (z <= 103) return { group: null, period: 7, row: 10, col: z - 89 + 3 };
  return g(z - 100, 7);
}

export const ELEMENTS: Element[] = RAW.split(';').map((s, i) => {
  const [symbol, name, mass, cat] = s.split('|');
  const z = i + 1;
  return { z, symbol, name, mass: Number(mass), cat: cat as Cat, ...position(z), en: EN[symbol] };
});

const ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
const CAP: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };

/** Distribuição eletrônica pelo diagrama de Linus Pauling (sem as exceções reais, ex.: Cr e Cu). */
export function electronConfig(z: number): string {
  let left = z;
  const out: string[] = [];
  for (const o of ORDER) {
    if (left <= 0) break;
    const n = Math.min(left, CAP[o[1]]);
    out.push(`${o}${toSup(n)}`);
    left -= n;
  }
  return out.join(' ');
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const toSup = (n: number) => String(n).split('').map((d) => SUP[Number(d)]).join('');

/** Camada de valência (maior n) e elétrons nela. */
export function valence(z: number): { shell: number; electrons: number } {
  let left = z;
  const byShell = new Map<number, number>();
  for (const o of ORDER) {
    if (left <= 0) break;
    const n = Math.min(left, CAP[o[1]]);
    byShell.set(Number(o[0]), (byShell.get(Number(o[0])) ?? 0) + n);
    left -= n;
  }
  const shell = Math.max(...byShell.keys());
  return { shell, electrons: byShell.get(shell)! };
}
