// Wallet Management using User-Scoped LocalStorage & Backend API Sync

const getStorageKey = (userId) => {
  if (!userId) return "rail_wallet_balance_guest";
  return `rail_wallet_balance_${userId}`;
};

export const getWalletBalanceSync = (userId) => {
  const key = getStorageKey(userId);
  const balance = localStorage.getItem(key);
  return balance ? parseFloat(balance) : 500; // Default ₹500
};

export const getWalletBalance = async (userId) => {
  const key = getStorageKey(userId);
  if (!userId) {
    return getWalletBalanceSync(null);
  }
  try {
    const res = await fetch(`https://smart-railway-mgmt-system.onrender.com/api/wallet/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.balance === "number") {
        localStorage.setItem(key, data.balance.toString());
        return data.balance;
      }
    }
  } catch (err) {
    console.warn("Wallet API unavailable, using local storage fallback:", err.message);
  }
  return getWalletBalanceSync(userId);
};

export const addMoney = async (amount, userId) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid amount. Please enter a positive value.");
  }
  const key = getStorageKey(userId);
  if (userId) {
    try {
      const res = await fetch("https://smart-railway-mgmt-system.onrender.com/api/wallet/add-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: numAmount }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(key, data.balance.toString());
        return data.balance;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add money");
      }
    } catch (err) {
      if (err.message && err.message.includes("Invalid amount")) throw err;
      console.warn("Wallet API unavailable, attempting local credit:", err.message);
    }
  }
  const currentBalance = getWalletBalanceSync(userId);
  const newBalance = currentBalance + numAmount;
  localStorage.setItem(key, newBalance.toString());
  return newBalance;
};

export const deductMoney = async (amount, userId) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Invalid fare amount.");
  }
  const key = getStorageKey(userId);
  if (userId) {
    try {
      const res = await fetch("https://smart-railway-mgmt-system.onrender.com/api/wallet/deduct-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: numAmount }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(key, data.balance.toString());
        return data.balance;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Insufficient wallet balance");
      }
    } catch (err) {
      if (err.message && (err.message.includes("balance") || err.message.includes("Insufficient"))) throw err;
      console.warn("Wallet API unavailable, attempting local debit:", err.message);
    }
  }
  const currentBalance = getWalletBalanceSync(userId);
  if (currentBalance < numAmount) {
    throw new Error("Insufficient wallet balance");
  }
  const newBalance = currentBalance - numAmount;
  localStorage.setItem(key, newBalance.toString());
  return newBalance;
};

export const resetWallet = (userId) => {
  const key = getStorageKey(userId);
  localStorage.setItem(key, "500");
  return 500;
};
