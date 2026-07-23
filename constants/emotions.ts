// Emotion tree: 3 levels deep
// Level 1: Primary emotions (6)
// Level 2: Secondary emotions
// Level 3: Tertiary emotions (leaf nodes - what gets stored)
// Each leaf has a short code for compact DB storage

export interface EmotionLeaf {
  code: string;   // e.g. "AL01" - stored in DB
  label: string;  // e.g. "Liberado/a" - displayed
}

export interface EmotionSecondary {
  label: string;
  children: EmotionLeaf[];
}

export interface EmotionPrimary {
  id: string;
  label: string;
  color: string;      // bg tint
  colorDark: string;  // border/glow when selected
  children: EmotionSecondary[];
}

export const emotionTree: EmotionPrimary[] = [
  {
    id: 'alegria',
    label: 'Alegria',
    color: '#FFF3C4',
    colorDark: '#f7e082',
    children: [
      {
        label: 'Alegre',
        children: [
          { code: 'AL01', label: 'Liberado/a' },
          { code: 'AL02', label: 'Eufórico/a' },
        ],
      },
      {
        label: 'Interesado/a',
        children: [
          { code: 'AL03', label: 'Entretenido/a' },
          { code: 'AL04', label: 'Importante' },
        ],
      },
      {
        label: 'Orgulloso/a',
        children: [
          { code: 'AL05', label: 'Seguro/a' },
          { code: 'AL06', label: 'Asertivo/a' },
        ],
      },
      {
        label: 'Aceptado/a',
        children: [
          { code: 'AL07', label: 'Satisfecho/a' },
          { code: 'AL08', label: 'Valiente' },
        ],
      },
      {
        label: 'Tranquilo/a',
        children: [
          { code: 'AL09', label: 'Cariñoso/a' },
          { code: 'AL10', label: 'Compasivo/a' },
        ],
      },
      {
        label: 'Íntimo/a',
        children: [
          { code: 'AL11', label: 'Esperanzado/a' },
          { code: 'AL12', label: 'Sensible' },
        ],
      },
      {
        label: 'Optimista',
        children: [
          { code: 'AL13', label: 'Inspirado/a' },
          { code: 'AL14', label: 'Abierto/a' },
        ],
      },
    ],
  },
  {
    id: 'sorpresa',
    label: 'Sorpresa',
    color: '#E8E0FF',
    colorDark: '#c4b5fd',
    children: [
      {
        label: 'Sorprendido/a',
        children: [
          { code: 'SO01', label: 'Confundido/a' },
          { code: 'SO02', label: 'Perplejo/a' },
        ],
      },
      {
        label: 'Asombrado/a',
        children: [
          { code: 'SO03', label: 'Entusiasmado/a' },
          { code: 'SO04', label: 'Maravillado/a' },
        ],
      },
    ],
  },
  {
    id: 'tristeza',
    label: 'Tristeza',
    color: '#D4E8FF',
    colorDark: '#93c5fd',
    children: [
      {
        label: 'Culpable',
        children: [
          { code: 'TR01', label: 'Desesperado/a' },
          { code: 'TR02', label: 'Deprimido/a' },
        ],
      },
      {
        label: 'Solo/a',
        children: [
          { code: 'TR03', label: 'Aislado/a' },
          { code: 'TR04', label: 'Abandonado/a' },
        ],
      },
      {
        label: 'Aburrido/a',
        children: [
          { code: 'TR05', label: 'Apático/a' },
          { code: 'TR06', label: 'Indiferente' },
        ],
      },
    ],
  },
  {
    id: 'disgusto',
    label: 'Disgusto',
    color: '#FFD4D4',
    colorDark: '#fca5a5',
    children: [
      {
        label: 'Crítico/a',
        children: [
          { code: 'DI01', label: 'Sarcástico/a' },
          { code: 'DI02', label: 'Escéptico/a' },
        ],
      },
      {
        label: 'Disconforme',
        children: [
          { code: 'DI03', label: 'Simplista' },
          { code: 'DI04', label: 'Reacio/a' },
        ],
      },
      {
        label: 'Decepcionado/a',
        children: [
          { code: 'DI05', label: 'Repulsivo/a' },
          { code: 'DI06', label: 'Aborrecido/a' },
        ],
      },
      {
        label: 'Horrible',
        children: [
          { code: 'DI07', label: 'Asqueado/a' },
          { code: 'DI08', label: 'Detestable' },
        ],
      },
      {
        label: 'Evasivo/a',
        children: [
          { code: 'DI09', label: 'Celoso/a' },
          { code: 'DI10', label: 'Resentido/a' },
        ],
      },
    ],
  },
  {
    id: 'ira',
    label: 'Ira',
    color: '#FFDDD4',
    colorDark: '#ffb09e',
    children: [
      {
        label: 'Amenazado/a',
        children: [
          { code: 'IR01', label: 'La atención' },
          { code: 'IR02', label: 'Inseguro/a' },
        ],
      },
      {
        label: 'Odioso/a',
        children: [
          { code: 'IR03', label: 'Resentido/a' },
          { code: 'IR04', label: 'Violento/a' },
        ],
      },
      {
        label: 'Desquiciado/a',
        children: [
          { code: 'IR05', label: 'Furioso/a' },
          { code: 'IR06', label: 'Hostil' },
        ],
      },
      {
        label: 'Agresivo/a',
        children: [
          { code: 'IR07', label: 'Enfurecido/a' },
          { code: 'IR08', label: 'Provocado/a' },
        ],
      },
      {
        label: 'Frustrado/a',
        children: [
          { code: 'IR09', label: 'Devastado/a' },
          { code: 'IR10', label: 'No asentado/a' },
        ],
      },
      {
        label: 'Distante',
        children: [
          { code: 'IR11', label: 'Retirado/a' },
          { code: 'IR12', label: 'Nulo/a' },
        ],
      },
      {
        label: 'Herido/a',
        children: [
          { code: 'IR13', label: 'Avergonzado/a' },
          { code: 'IR14', label: 'Ridiculizado/a' },
        ],
      },
      {
        label: 'Humillado/a',
        children: [
          { code: 'IR15', label: 'Injusto' },
          { code: 'IR16', label: 'Desmoralizado/a' },
        ],
      },
    ],
  },
  {
    id: 'miedo',
    label: 'Miedo',
    color: '#D8E8D4',
    colorDark: '#a7d0a0',
    children: [
      {
        label: 'Rechazado/a',
        children: [
          { code: 'MI01', label: 'Inferior' },
          { code: 'MI02', label: 'Descuidado/a' },
        ],
      },
      {
        label: 'Sumiso/a',
        children: [
          { code: 'MI03', label: 'Perseguido/a' },
          { code: 'MI04', label: 'Ridiculizado/a' },
        ],
      },
      {
        label: 'Inseguro/a',
        children: [
          { code: 'MI05', label: 'Inadecuado/a' },
          { code: 'MI06', label: 'Inferior' },
        ],
      },
      {
        label: 'Ansioso/a',
        children: [
          { code: 'MI07', label: 'Abrumado/a' },
          { code: 'MI08', label: 'Preocupado/a' },
        ],
      },
      {
        label: 'Asustado/a',
        children: [
          { code: 'MI09', label: 'Espantado/a' },
          { code: 'MI10', label: 'Aterrorizado/a' },
        ],
      },
    ],
  },
];

// Utility: get full label from code
export function getEmotionLabel(code: string): string {
  for (const primary of emotionTree) {
    for (const secondary of primary.children) {
      for (const leaf of secondary.children) {
        if (leaf.code === code) return leaf.label;
      }
    }
  }
  return code;
}

// Utility: get primary emotion from code
export function getEmotionPrimary(code: string): EmotionPrimary | undefined {
  const prefix = code.substring(0, 2);
  const map: Record<string, string> = {
    AL: 'alegria', SO: 'sorpresa', TR: 'tristeza',
    DI: 'disgusto', IR: 'ira', MI: 'miedo',
  };
  return emotionTree.find((e) => e.id === map[prefix]);
}

// Utility: get full path label "Alegria > Alegre > Liberado/a"
export function getEmotionPath(code: string): string {
  for (const primary of emotionTree) {
    for (const secondary of primary.children) {
      for (const leaf of secondary.children) {
        if (leaf.code === code) {
          return `${primary.label} > ${secondary.label} > ${leaf.label}`;
        }
      }
    }
  }
  return code;
}
