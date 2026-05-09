export interface PasswordStrength {
  entropyBits: number;
  score: number;
  label: 'Weak' | 'Fair' | 'Strong' | 'Excellent';
}

export function estimatePasswordEntropy(password: string): number {
  if (!password) return 0;

  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;

  if (pool === 0) return 0;
  return Math.log2(pool) * password.length;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const entropyBits = estimatePasswordEntropy(password);

  if (entropyBits < 30) {
    return { entropyBits, score: 1, label: 'Weak' };
  }
  if (entropyBits < 45) {
    return { entropyBits, score: 2, label: 'Fair' };
  }
  if (entropyBits < 60) {
    return { entropyBits, score: 3, label: 'Strong' };
  }
  return { entropyBits, score: 4, label: 'Excellent' };
}
