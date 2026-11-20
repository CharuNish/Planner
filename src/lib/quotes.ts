const QUOTES = [
  "Small steps every day still add up to big places. 🌱",
  "You don't have to be perfect, just a little better than yesterday.",
  "Future you is already proud of what you're doing today.",
  "Done is better than perfect. Start with ten minutes.",
  "Rest if you must, but don't quit. You've got this! 💪",
  "Your only competition is who you were yesterday.",
  "Discipline is choosing what you want most over what you want now.",
  "A little progress each day adds up to big results.",
  "Be gentle with yourself. You're doing the best you can, and that's a lot.",
  "Dream big, start small, act now. ✨",
];
export function quoteOfTheDay(dateISO: string) {
  const n = dateISO.split("-").reduce((a, b) => a + Number(b), 0);
  return QUOTES[n % QUOTES.length];
}
