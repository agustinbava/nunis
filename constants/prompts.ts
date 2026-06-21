export interface JournalPrompt {
  id: string;
  category: string;
  categoryEmoji: string;
  question: string;
}

export const journalPrompts: JournalPrompt[] = [
  // Gratitud
  { id: 'g1', category: 'Gratitud', categoryEmoji: '🙏', question: '¿Qué 3 cosas agradecés de hoy?' },
  { id: 'g2', category: 'Gratitud', categoryEmoji: '🙏', question: '¿Quién te hizo sentir bien hoy y por qué?' },
  { id: 'g3', category: 'Gratitud', categoryEmoji: '🙏', question: '¿Qué momento simple disfrutaste hoy?' },
  // Reflexión
  { id: 'r1', category: 'Reflexión', categoryEmoji: '🪞', question: '¿Qué aprendiste hoy sobre vos?' },
  { id: 'r2', category: 'Reflexión', categoryEmoji: '🪞', question: '¿Qué harías diferente si pudieras repetir el día?' },
  { id: 'r3', category: 'Reflexión', categoryEmoji: '🪞', question: '¿Qué emoción predominó hoy y a qué la asociás?' },
  { id: 'r4', category: 'Reflexión', categoryEmoji: '🪞', question: '¿Qué situación te generó más estrés y cómo la manejaste?' },
  // Logros
  { id: 'l1', category: 'Logros', categoryEmoji: '🏆', question: '¿De qué te sentís orgulloso/a hoy?' },
  { id: 'l2', category: 'Logros', categoryEmoji: '🏆', question: '¿Qué obstáculo superaste hoy, por pequeño que sea?' },
  { id: 'l3', category: 'Logros', categoryEmoji: '🏆', question: '¿Qué hábito positivo mantuviste hoy?' },
  // Emociones
  { id: 'e1', category: 'Emociones', categoryEmoji: '💭', question: '¿Qué te hizo sonreír hoy?' },
  { id: 'e2', category: 'Emociones', categoryEmoji: '💭', question: 'Si tu día fuera una película, ¿cuál sería el título?' },
  { id: 'e3', category: 'Emociones', categoryEmoji: '💭', question: '¿Qué necesitarías para que mañana sea un día mejor?' },
  { id: 'e4', category: 'Emociones', categoryEmoji: '💭', question: '¿Hay algo que te preocupa y no dijiste en voz alta hoy?' },
  // Relaciones
  { id: 'rel1', category: 'Relaciones', categoryEmoji: '❤️', question: '¿Cómo estuvo tu conexión con las personas hoy?' },
  { id: 'rel2', category: 'Relaciones', categoryEmoji: '❤️', question: '¿Alguien necesita que le prestes más atención?' },
  // Cuerpo
  { id: 'b1', category: 'Cuerpo', categoryEmoji: '🧘', question: '¿Cómo trataste a tu cuerpo hoy?' },
  { id: 'b2', category: 'Cuerpo', categoryEmoji: '🧘', question: '¿Dormiste bien? ¿Qué pudo haber afectado tu descanso?' },
];

export function getRandomPrompts(count: number = 3): JournalPrompt[] {
  const shuffled = [...journalPrompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getPromptsByCategory(category: string): JournalPrompt[] {
  return journalPrompts.filter((p) => p.category === category);
}

export const categories = [...new Set(journalPrompts.map((p) => p.category))];
