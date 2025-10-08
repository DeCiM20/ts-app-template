import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner"
import { twMerge } from "tailwind-merge"
import { ZodSchema } from "zod"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    toast.error("Failed to copy to clipboard")
  }
}

export const zParse = <T>({ schema, inputs }: { schema: ZodSchema<T>; inputs: unknown }) => {
  const { success, error, data } = schema.safeParse(inputs)

  if (!success || error) {
    const zErrors: Record<string, string[] | undefined> = error?.flatten().fieldErrors
    const errors: Record<string, string> = {}

    Object.keys(zErrors).map(i => {
      const errorMessage = zErrors[i]?.[0]
      errors[i] = errorMessage ?? `Invalid input ${i}`
    })

    return { success, data: null, error: errors }
  }

  return { success: true, data: data, error: null }
}

export const dateLocale = (date: Date | string): string => {
  // Months array to convert month index to month name
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  date = new Date(date)

  // Get various components of the date
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"

  // Convert hours from 24-hour format to 12-hour format
  hours = hours % 12
  hours = hours ? hours : 12 // Handle midnight (0 hours)

  // Construct the formatted date string
  const formattedDate = `${day} ${month} ${year} ${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`
  return formattedDate
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const truncateString = (input: string, length: number): string => {
  if (length < 0) {
    throw new Error("Length cannot be negative")
  }

  if (input.length <= length) {
    return input
  }

  return input.slice(0, length) + "..."
}
