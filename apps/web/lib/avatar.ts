function firstChar(value: string | null | undefined): string {
  return (value ?? "").trim().charAt(0).toUpperCase();
}

export function getAvatarInitials(name: string | null | undefined, email: string): string {
  const cleanName = (name ?? "").trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${firstChar(parts[0])}${firstChar(parts[1])}` || "U";
    }
    return `${firstChar(parts[0])}${firstChar(email)}` || "U";
  }
  return `${firstChar(email)}${firstChar(email.split("@")[1] ?? "")}` || "U";
}

export function avatarTone(seed: string): string {
  let hash = 0;
  for (const ch of seed) {
    hash = (hash + ch.charCodeAt(0)) % 6;
  }
  const tones = [
    "bg-trap-sky-100 text-trap-sky-900",
    "bg-indigo-100 text-indigo-900",
    "bg-emerald-100 text-emerald-900",
    "bg-amber-100 text-amber-900",
    "bg-rose-100 text-rose-900",
    "bg-violet-100 text-violet-900",
  ] as const;
  return tones[hash]!;
}
