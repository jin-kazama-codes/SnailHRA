export function toBranchId(name?: string | null): string {
  if (!name) return "";
  const str = String(name).trim();
  if (str.startsWith("br-")) return str.toLowerCase();
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned ? `br-${cleaned}` : "";
}

export function toBranchName(idOrName?: string | null, customBranches: string[] = ["Shashtri Nagar", "Noida", "Ludhiana"]): string {
  if (!idOrName) return "";
  const str = String(idOrName).trim();
  
  // Exact match with known custom branches
  const exactMatch = customBranches.find(b => b.toLowerCase() === str.toLowerCase());
  if (exactMatch) return exactMatch;

  // Match by branch ID (e.g. "br-noida" -> "Noida")
  const idMatch = customBranches.find(b => toBranchId(b) === str.toLowerCase());
  if (idMatch) return idMatch;

  if (str.startsWith("br-")) {
    return str
      .slice(3)
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return str;
}

export function encodeBranchPrefix(text: string | null | undefined, branch?: string | null): string {
  const clean = (text || "").replace(/^\[Branch:\s*[^\]]+\]\s*/i, "").trim();
  if (!branch || branch === "All Branches") return clean;
  const bName = toBranchName(branch);
  return `[Branch: ${bName}] ${clean}`;
}

export function extractBranchPrefix(text: string | null | undefined): { branch?: string; cleanText: string } {
  if (!text) return { cleanText: "" };
  const match = String(text).match(/^\[Branch:\s*([^\]]+)\]\s*(.*)$/is);
  if (match) {
    return {
      branch: toBranchName(match[1].trim()),
      cleanText: match[2].trim()
    };
  }
  return { cleanText: String(text) };
}

