const PUBLIC_ATHER_MODELS = new Map([
  ["450x lr", "450X LR"],
  ["450x hr", "450X HR"],
  ["rizta s", "Rizta S"],
])

export function getPublicAtherModelName(brand: string, modelName: string) {
  if (!/^ather(?:\s+energy)?$/i.test(brand.trim())) {
    return null
  }

  const normalizedName = modelName
    .trim()
    .replace(/^ather\s+/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase()

  return PUBLIC_ATHER_MODELS.get(normalizedName) ?? null
}
