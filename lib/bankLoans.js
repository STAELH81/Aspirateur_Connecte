const economy = require("./economy");
const cfg = require("./economyConfig").bankLoan;

function loanCfg() {
  return cfg;
}

function readLoan(acc) {
  const loan = acc.bankLoan;
  if (!loan || !loan.owed || loan.owed <= 0) return null;
  return loan;
}

function isLoanOverdue(loan) {
  if (!loan?.dueAt || !loan.owed) return false;
  return Date.now() > loan.dueAt;
}

function hasDebt(userId) {
  return readLoan(economy.getAccount(userId)) != null;
}

function getStatus(userId) {
  const acc = economy.getAccount(userId);
  const loan = readLoan(acc);
  const c = loanCfg();
  const interestPercent = Math.round(c.interestRate * 100);

  if (!loan) {
    const wait = economy.msUntilReady(acc.lastBankLoanRepaidAt || 0, c.cooldownMs);
    return {
      hasDebt: false,
      owed: 0,
      principal: 0,
      interestPercent,
      minAmount: c.minAmount,
      maxAmount: c.maxAmount,
      cooldownMs: wait,
      dueAt: null,
      borrowedAt: null,
      overdue: false,
    };
  }

  return {
    hasDebt: true,
    owed: loan.owed,
    principal: loan.principal,
    interestPercent: loan.interestPercent ?? interestPercent,
    minAmount: c.minAmount,
    maxAmount: c.maxAmount,
    cooldownMs: 0,
    dueAt: loan.dueAt || null,
    borrowedAt: loan.borrowedAt || null,
    overdue: isLoanOverdue(loan),
  };
}

function takeLoan(userId, amount) {
  const c = loanCfg();
  const acc = economy.getAccount(userId);
  const existing = readLoan(acc);
  if (existing) {
    return { ok: false, reason: `Tu as deja un pret actif : **${existing.owed}** coins a rembourser.` };
  }

  const wait = economy.msUntilReady(acc.lastBankLoanRepaidAt || 0, c.cooldownMs);
  if (wait > 0) return { ok: false, reason: "Cooldown pret banque.", waitMs: wait };

  const principal = Math.floor(amount);
  if (principal < c.minAmount) {
    return { ok: false, reason: `Montant minimum : **${c.minAmount}** coins.` };
  }
  if (principal > c.maxAmount) {
    return { ok: false, reason: `Montant maximum : **${c.maxAmount}** coins.` };
  }

  const interestPercent = Math.round(c.interestRate * 100);
  const owed = Math.floor(principal * (1 + c.interestRate));
  const balanceBefore = economy.getBalance(userId);
  const borrowedAt = Date.now();

  economy.updateAccount(userId, (a) => {
    a.balance += principal;
    a.bankLoan = {
      principal,
      owed,
      interestPercent,
      borrowedAt,
      dueAt: borrowedAt + c.dueMs,
    };
  });

  const balanceAfter = economy.getBalance(userId);
  return {
    ok: true,
    principal,
    owed,
    interestPercent,
    balance: balanceAfter,
    balanceBefore,
    balanceAfter,
    borrowedAt,
    dueAt: borrowedAt + c.dueMs,
  };
}

function repayLoan(userId, amount) {
  const loan = readLoan(economy.getAccount(userId));
  if (!loan) {
    return { ok: false, reason: "Tu n'as pas de pret banque en cours." };
  }

  const requested = Math.floor(amount);
  if (!Number.isFinite(requested) || requested < 1) {
    return { ok: false, reason: "Montant invalide." };
  }

  const balanceBefore = economy.getBalance(userId);
  if (balanceBefore < 1) {
    return { ok: false, reason: "Solde insuffisant pour rembourser." };
  }

  const outcome = { paid: 0, remaining: 0, cleared: false };

  economy.updateAccount(userId, (a) => {
    const current = readLoan(a);
    if (!current) return;
    const take = Math.min(requested, current.owed, a.balance);
    if (take < 1) return;
    a.balance -= take;
    current.owed -= take;
    outcome.paid = take;
    outcome.remaining = current.owed;
    if (current.owed <= 0) {
      delete a.bankLoan;
      a.lastBankLoanRepaidAt = Date.now();
      outcome.remaining = 0;
      outcome.cleared = true;
    } else {
      a.bankLoan = current;
    }
  });

  if (outcome.paid < 1) {
    return { ok: false, reason: "Solde insuffisant pour rembourser." };
  }

  return {
    ok: true,
    paid: outcome.paid,
    remaining: outcome.remaining,
    cleared: outcome.cleared,
    balance: economy.getBalance(userId),
    balanceBefore,
    balanceAfter: economy.getBalance(userId),
  };
}

function casinoBlockReason(userId) {
  const loan = readLoan(economy.getAccount(userId));
  if (!loan) return null;
  const c = loanCfg();

  if (c.blockCasinoWhileDebt) {
    const st = getStatus(userId);
    return `Dette banque : **${st.owed}** coins. Rembourse via **Banque** avant le casino.`;
  }

  if (c.blockCasinoWhenOverdue && isLoanOverdue(loan)) {
    return [
      `Pret **en retard** : **${loan.owed}** coins a rembourser.`,
      "Casino **bloque** jusqu'au remboursement **total** (bouton **Banque**).",
    ].join("\n");
  }

  return null;
}

function formatStatusLines(status) {
  const c = loanCfg();
  const lines = [
    "Emprunte pour **jouer au casino** si tu es short.",
    `Interet fixe : **${status.interestPercent}%** (ex. ${c.minAmount} → **${Math.floor(c.minAmount * (1 + c.interestRate))}** a rendre).`,
    `Montant : **${c.minAmount}** – **${c.maxAmount}** coins.`,
  ];
  if (status.hasDebt) {
    lines.push(
      `Dette : **${status.owed}** coins (emprunte **${status.principal}**).`,
      status.dueAt
        ? `Echeance : <t:${Math.floor(status.dueAt / 1000)}:R> (<t:${Math.floor(status.dueAt / 1000)}:f>).`
        : null
    );
    if (status.overdue) {
      lines.push("**En retard** — casino bloque jusqu'au remboursement total.");
    } else {
      lines.push("Avant l'echeance : casino **autorise** (rembourse quand tu peux).");
    }
  } else if (status.cooldownMs > 0) {
    const ts = Math.floor((Date.now() + status.cooldownMs) / 1000);
    lines.push(`Prochain pret <t:${ts}:R>.`);
  } else {
    lines.push("Aucune dette — tu peux emprunter.");
  }
  return lines.filter(Boolean);
}

module.exports = {
  loanCfg,
  getStatus,
  hasDebt,
  takeLoan,
  repayLoan,
  casinoBlockReason,
  formatStatusLines,
};
