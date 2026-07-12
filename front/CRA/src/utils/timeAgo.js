export default function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'щойно';
  const m = Math.floor(s / 60); if (m < 60) return `${m} хв. тому`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} год. тому`;
  const d = Math.floor(h / 24); if (d < 30) return `${d} дн. тому`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo} міс. тому`;
  return `${Math.floor(mo / 12)} р. тому`;
}