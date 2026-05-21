module.exports = {
  currency: "coins",
  startBalance: 100,
  daily: { min: 80, max: 150, cooldownMs: 24 * 60 * 60 * 1000 },
  work: { min: 15, max: 45, cooldownMs: 45 * 60 * 1000 },
  bet: { min: 10, maxAbsolute: 500, maxBalanceRatio: 0.25 },
  coinflip: { multiplier: 1.9 },
  slots: {
    symbols: [
      { id: "cherry", emoji: "🍒", weight: 38 },
      { id: "lemon", emoji: "🍋", weight: 28 },
      { id: "star", emoji: "⭐", weight: 18 },
      { id: "diamond", emoji: "💎", weight: 11 },
      { id: "seven", emoji: "7️⃣", weight: 5 },
    ],
    payouts: {
      three: { seven: 10, diamond: 5, star: 3, lemon: 2, cherry: 1.5 },
      pair: 1.15,
    },
  },
};
