export const TYPE_EMOJI: Record<string, string> = {
  disease: '🤧',
  drug: '💊',
  anatomy: '🦴',
  microbe: '🦠',
  molecule: '🧪',
  physiology: '🫀',
  finding: '🩺',
  concept: '💡',
};

export const getEmoji = (type: string) => TYPE_EMOJI[type] || '📄';
