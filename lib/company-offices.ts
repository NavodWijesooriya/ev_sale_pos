/** Office (location) details of a finance / insurance company. Pure, shared by the actions and the forms. */
export interface OfficeInput {
  name: string
  address?: string | null
  phone?: string | null
}

export interface CleanOffice {
  name: string
  address: string | null
  phone: string | null
}

/** Trims and validates one office; throws an Error with a message fit for the screen. */
export function cleanOffice(input: OfficeInput): CleanOffice {
  const name = input.name?.trim() ?? ""
  const address = input.address?.trim() ?? ""
  const phone = input.phone?.trim() ?? ""
  if (!name) throw new Error("Enter the office name.")
  if (name.length > 120) throw new Error("The office name is too long (120 characters at most).")
  if (address.length > 300) throw new Error("The office address is too long (300 characters at most).")
  if (phone.length > 40) throw new Error("The office phone number is too long (40 characters at most).")
  return { name, address: address || null, phone: phone || null }
}

/** Cleans a list of offices from one form; rows left completely blank are ignored and names must differ. */
export function cleanOffices(inputs: OfficeInput[] | undefined): CleanOffice[] {
  const rows = (inputs ?? []).filter((row) => (row.name ?? "").trim() || (row.address ?? "").trim() || (row.phone ?? "").trim())
  const cleaned = rows.map(cleanOffice)
  const seen = new Set<string>()
  for (const office of cleaned) {
    const key = office.name.toLowerCase()
    if (seen.has(key)) throw new Error(`The office "${office.name}" is listed twice.`)
    seen.add(key)
  }
  return cleaned
}
