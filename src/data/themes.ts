/** Eixos temáticos para pesquisa (sugestões genéricas; os temas reais ela cadastra). */
import type { EssayTheme } from '../db/types';
import { SEED_STAMP } from './seed';

const AXES: [string, string][] = [
  ['Tecnologia e sociedade', 'Desinformação e algoritmos; inteligência artificial e trabalho; exclusão digital'],
  ['Educação', 'Evasão escolar; ensino a distância; leitura no Brasil'],
  ['Meio ambiente', 'Mudanças climáticas e eventos extremos; lixo urbano; preservação da Amazônia'],
  ['Saúde', 'Saúde mental; vacinação e hesitação vacinal; sedentarismo'],
  ['Cidadania e direitos', 'Racismo estrutural; violência contra a mulher; acessibilidade'],
  ['Trabalho e economia', 'Trabalho por aplicativos; desigualdade de renda; empreendedorismo e informalidade'],
  ['Cidades', 'Mobilidade urbana; moradia e favelização; segurança pública'],
  ['Cultura e identidade', 'Valorização da cultura afro-brasileira; patrimônio histórico; consumo e redes sociais'],
];

export function seedEssayThemes(): EssayTheme[] {
  return AXES.map(([axis, notes], i) => ({
    id: `eixo-${i + 1}`,
    title: `Eixo: ${axis}`,
    axis,
    notes: `Ideias para pesquisar: ${notes}. Cadastre o tema exato que você quiser treinar.`,
    used: false,
    updated_at: SEED_STAMP,
    device_id: 'seed',
  }));
}
