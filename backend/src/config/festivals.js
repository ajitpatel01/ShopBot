/**
 * Indian festival and holiday calendar.
 * Used to inject contextual greetings into the AI system prompt.
 * Dates are approximate — update yearly.
 */

const FESTIVALS = [
  { name: 'New Year', emoji: '🎉', greeting: 'Happy New Year', month: 0, day: 1 },
  { name: 'Makar Sankranti', emoji: '🪁', greeting: 'Happy Makar Sankranti', month: 0, day: 14 },
  { name: 'Republic Day', emoji: '🇮🇳', greeting: 'Happy Republic Day', month: 0, day: 26 },
  { name: 'Holi', emoji: '🎨', greeting: 'Happy Holi', month: 2, day: 14 },
  { name: 'Ram Navami', emoji: '🙏', greeting: 'Happy Ram Navami', month: 3, day: 6 },
  { name: 'Eid ul-Fitr', emoji: '🌙', greeting: 'Eid Mubarak', month: 3, day: 10 },
  { name: 'Ambedkar Jayanti', emoji: '🙏', greeting: 'Jai Bhim', month: 3, day: 14 },
  { name: 'Independence Day', emoji: '🇮🇳', greeting: 'Happy Independence Day', month: 7, day: 15 },
  { name: 'Ganesh Chaturthi', emoji: '🐘', greeting: 'Ganpati Bappa Morya', month: 8, day: 7 },
  { name: 'Navratri', emoji: '🪔', greeting: 'Happy Navratri', month: 9, day: 3 },
  { name: 'Dussehra', emoji: '🏹', greeting: 'Happy Dussehra', month: 9, day: 12 },
  { name: 'Diwali', emoji: '🪔', greeting: 'Happy Diwali', month: 9, day: 31 },
  { name: 'Bhai Dooj', emoji: '❤️', greeting: 'Happy Bhai Dooj', month: 10, day: 2 },
  { name: 'Guru Nanak Jayanti', emoji: '🙏', greeting: 'Waheguru Ji Ka Khalsa', month: 10, day: 15 },
  { name: 'Christmas', emoji: '🎄', greeting: 'Merry Christmas', month: 11, day: 25 },
  { name: 'New Year Eve', emoji: '🎊', greeting: 'Happy New Year Eve', month: 11, day: 31 },
];

function getFestivalToday() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return FESTIVALS.find((f) => f.month === month && f.day === day) || null;
}

function getUpcomingFestival(daysAhead = 3) {
  const now = new Date();
  for (let i = 1; i <= daysAhead; i++) {
    const future = new Date(now);
    future.setDate(now.getDate() + i);
    const found = FESTIVALS.find(
      (f) => f.month === future.getMonth() && f.day === future.getDate()
    );
    if (found) return { ...found, daysUntil: i };
  }
  return null;
}

module.exports = {
  FESTIVALS,
  getFestivalToday,
  getUpcomingFestival,
};
