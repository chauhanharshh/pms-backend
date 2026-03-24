export const DAY_MS = 1000 * 60 * 60 * 24;

export function calculateRoomDays(
  checkIn: Date,
  checkOut: Date,
  standardCheckOut: string = "11:00"
): number {
  if (!checkIn || !checkOut || isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return 1;
  }

  // 1. Calculate Base Nights (Date difference)
  const ciDate = new Date(checkIn);
  ciDate.setHours(0, 0, 0, 0);
  const coDate = new Date(checkOut);
  coDate.setHours(0, 0, 0, 0);

  let days = Math.floor((coDate.getTime() - ciDate.getTime()) / DAY_MS);

  // 2. Early Check-In Rule: Before 9:00 AM
  const ciHours = checkIn.getHours();
  if (ciHours < 9) {
    days += 1;
  }

  // 3. Late Check-Out Rule: After standard time (default 11:00 AM)
  const [stdH, stdM] = standardCheckOut.split(':').map(Number);
  const coHours = checkOut.getHours();
  const coMinutes = checkOut.getMinutes();

  if (coHours > stdH || (coHours === stdH && coMinutes > (stdM || 0))) {
    days += 1;
  }

  // 4. Minimum 1 Day
  return Math.max(days, 1);
}
