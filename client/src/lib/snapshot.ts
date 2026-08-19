export type LessonSnapshot = {
  courseTitle: string;
  lessonTitle: string;
  channel: string;
  duration: string;
  lessonNumber: number;
  lessonCount: number;
  currentSecond: number;
};

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, character => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function titleLines(value: string) {
  const words = value.trim().split(/\s+/);
  const lines = ["", ""];
  for (const word of words) {
    const target = lines[0].length <= lines[1].length ? 0 : 1;
    lines[target] = `${lines[target]} ${word}`.trim();
  }
  return lines.map(line => escapeXml(line.slice(0, 48)));
}

export function formatCourseTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function createLessonSnapshot(snapshot: LessonSnapshot) {
  const [firstLine, secondLine] = titleLines(snapshot.lessonTitle);
  const timestamp = formatCourseTime(snapshot.currentSecond);
  const courseTitle = escapeXml(snapshot.courseTitle);
  const channel = escapeXml(snapshot.channel);
  const duration = escapeXml(snapshot.duration);
  const lessonCount = String(snapshot.lessonCount).padStart(2, "0");
  const lessonNumber = String(snapshot.lessonNumber).padStart(2, "0");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="Lesson Ledger course snapshot">
  <defs>
    <linearGradient id="ground" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1b1c1a"/><stop offset="1" stop-color="#3d4549"/></linearGradient>
    <linearGradient id="beam" x1="0" x2="1"><stop stop-color="#cfd9ec" stop-opacity=".95"/><stop offset="1" stop-color="#99b4c9" stop-opacity=".2"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#ground)"/>
  <circle cx="1328" cy="170" r="250" fill="none" stroke="#dae5ef" stroke-opacity=".23" stroke-width="2"/>
  <circle cx="1328" cy="170" r="150" fill="none" stroke="#dae5ef" stroke-opacity=".12" stroke-width="2"/>
  <path d="M-80 760 720 270l960 210v420H-80Z" fill="url(#beam)" opacity=".48"/>
  <rect x="92" y="86" width="58" height="58" fill="#f5f5ef"/><text x="110" y="127" fill="#20211f" font-family="Georgia, serif" font-size="34" font-style="italic">L</text>
  <text x="176" y="122" fill="#f8f8f4" font-family="Georgia, serif" font-size="38">Lesson Ledger</text>
  <text x="92" y="250" fill="#d4dae0" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4">COURSE SNAPSHOT</text>
  <text x="92" y="310" fill="#aeb9c3" font-family="Arial, sans-serif" font-size="24">${courseTitle}</text>
  <text x="92" y="455" fill="#ffffff" font-family="Georgia, serif" font-size="76">${firstLine}</text>
  <text x="92" y="535" fill="#ffffff" font-family="Georgia, serif" font-size="76">${secondLine}</text>
  <line x1="92" x2="1508" y1="648" y2="648" stroke="#f2f4f5" stroke-opacity=".35"/>
  <text x="92" y="718" fill="#ffffff" font-family="Arial, sans-serif" font-size="25" font-weight="700">LESSON ${lessonNumber} OF ${lessonCount}</text>
  <text x="92" y="764" fill="#d7dce1" font-family="Arial, sans-serif" font-size="24">${channel} · ${duration}</text>
  <rect x="1240" y="692" width="268" height="108" fill="#f6f6f1"/><text x="1270" y="736" fill="#4b5052" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">COURSE TIMER</text><text x="1270" y="782" fill="#20211f" font-family="Georgia, serif" font-size="48">${timestamp}</text>
</svg>`;
}
