import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMonthlyDateRange(
  startDay = 1,
  referenceDate = new Date(),
) {
  const date = new Date(referenceDate)
  let startYear = date.getFullYear()
  let startMonth = date.getMonth()

  if (date.getDate() < startDay) {
    startMonth -= 1
    if (startMonth < 0) {
      startMonth = 11
      startYear -= 1
    }
  }

  const startDayClamped = Math.min(
    startDay,
    new Date(startYear, startMonth + 1, 0).getDate(),
  )
  const startDate = new Date(startYear, startMonth, startDayClamped)

  let nextYear = startDate.getFullYear()
  let nextMonth = startDate.getMonth() + 1
  if (nextMonth > 11) {
    nextMonth = 0
    nextYear += 1
  }
  const nextStartDayClamped = Math.min(
    startDay,
    new Date(nextYear, nextMonth + 1, 0).getDate(),
  )
  const endDate = new Date(nextYear, nextMonth, nextStartDayClamped)
  endDate.setDate(endDate.getDate() - 1)

  return { startDate, endDate }
}
