import { formatTimestamp, timestampToSeconds, type TimestampedNote } from "./learning";

export type NotesExportFormat = "txt" | "doc" | "pdf" | "png";

export const NOTES_EXPORT_FORMATS: Array<{ value: NotesExportFormat; label: string }> = [
  { value: "txt", label: "TXT document" },
  { value: "doc", label: "Word document (.doc)" },
  { value: "pdf", label: "PDF document" },
  { value: "png", label: "PNG image" },
];

export function getNotesExportFileName(courseTopic: string, format: NotesExportFormat) {
  const stem = courseTopic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lesson-ledger";
  return `${stem}-notes.${format}`;
}

/** Produces a shareable lesson URL that starts at the moment the note was recorded. */
export function getTimestampedVideoUrl(videoUrl: string | undefined, timestamp: string) {
  if (!videoUrl) return undefined;
  try {
    const url = new URL(videoUrl);
    url.searchParams.set("t", `${timestampToSeconds(timestamp)}s`);
    return url.toString();
  } catch {
    return videoUrl;
  }
}

export function formatNotesText(courseTopic: string, notes: TimestampedNote[]) {
  const title = courseTopic.trim() || "Lesson Ledger course";
  const entries = [...notes].sort((left, right) => left.createdAt - right.createdAt).map((note, index) => {
    const module = note.roadmapModuleTitle || "Course lesson";
    const lesson = note.lessonTitle || "Saved lesson";
    const video = getTimestampedVideoUrl(note.videoUrl, note.timestamp) || "Link unavailable for an older saved note";
    return `${index + 1}. ${module}\nLesson: ${lesson}\nTimestamp: ${formatTimestamp(note.timestamp)}\nVideo: ${video}\nNote: ${note.text}`;
  });
  return `LESSON LEDGER NOTES\nCourse: ${title}\n\n${entries.length ? entries.join("\n\n---\n\n") : "No timestamped notes have been saved yet."}\n`;
}

export function formatNotesDocHtml(courseTopic: string, notes: TimestampedNote[]) {
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
  const title = escape(courseTopic.trim() || "Lesson Ledger course");
  const entries = [...notes].sort((left, right) => left.createdAt - right.createdAt).map((note, index) => {
    const timestampedVideoUrl = getTimestampedVideoUrl(note.videoUrl, note.timestamp);
    const link = timestampedVideoUrl ? `<a href="${escape(timestampedVideoUrl)}">${escape(note.lessonTitle || "Open lesson")}</a>` : "Link unavailable for an older saved note";
    return `<section><h2>${index + 1}. ${escape(note.roadmapModuleTitle || "Course lesson")}</h2><p><strong>Lesson:</strong> ${escape(note.lessonTitle || "Saved lesson")}<br><strong>Timestamp:</strong> ${escape(formatTimestamp(note.timestamp))}<br><strong>Video:</strong> ${link}</p><p>${escape(note.text).replace(/\n/g, "<br>")}</p></section>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Lesson Ledger notes</title><style>body{font-family:Arial,sans-serif;color:#20211f;line-height:1.55;padding:32px}h1{font-size:26px}h2{font-size:18px;margin-top:28px}a{color:#1f4f8f;word-break:break-all}section{border-top:1px solid #d9dddf}</style></head><body><h1>Lesson Ledger notes: ${title}</h1>${entries.join("") || "<p>No timestamped notes have been saved yet.</p>"}</body></html>`;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function createNotesPng(courseTopic: string, notes: TimestampedNote[]) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG export is unavailable in this browser.");
  const width = 1500;
  const margin = 90;
  const contentWidth = width - margin * 2;
  context.font = "28px Arial";
  const measuredBlocks = [...notes].sort((left, right) => left.createdAt - right.createdAt).map(note => {
    const lines = [
      `Module: ${note.roadmapModuleTitle || "Course lesson"}`,
      `Lesson: ${note.lessonTitle || "Saved lesson"}`,
      `Timestamp: ${formatTimestamp(note.timestamp)}`,
      `Video: ${getTimestampedVideoUrl(note.videoUrl, note.timestamp) || "Link unavailable for an older saved note"}`,
      ...wrapCanvasText(context, `Note: ${note.text}`, contentWidth),
    ];
    return lines;
  });
  const height = Math.max(700, 220 + measuredBlocks.reduce((total, lines) => total + lines.length * 46 + 46, 0));
  canvas.width = width;
  canvas.height = Math.min(height, 16_000);
  context.fillStyle = "#fbfbfa";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#20211f";
  context.font = "bold 48px Georgia";
  context.fillText("Lesson Ledger notes", margin, 90);
  context.font = "28px Arial";
  context.fillStyle = "#555954";
  context.fillText(`Course: ${courseTopic.trim() || "Lesson Ledger course"}`, margin, 142);
  let y = 210;
  measuredBlocks.forEach((lines, index) => {
    context.strokeStyle = "#d9dddf";
    context.beginPath();
    context.moveTo(margin, y - 24);
    context.lineTo(width - margin, y - 24);
    context.stroke();
    context.fillStyle = "#20211f";
    context.font = "bold 30px Arial";
    context.fillText(`${index + 1}. ${lines[0].replace("Module: ", "")}`, margin, y + 12);
    context.font = "26px Arial";
    context.fillStyle = "#4f5357";
    lines.slice(1).forEach((line, lineIndex) => context.fillText(line, margin, y + 58 + lineIndex * 42));
    y += lines.length * 46 + 70;
  });
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not create the PNG export.")), "image/png"));
}

async function downloadPdf(courseTopic: string, notes: TimestampedNote[]) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageBottom = pdf.internal.pageSize.getHeight() - margin;
  let y = 64;
  const write = (text: string, size = 11, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width) as string[];
    const blockHeight = lines.length * (size + 4);
    if (y + blockHeight > pageBottom) {
      pdf.addPage();
      y = 64;
    }
    pdf.text(lines, margin, y);
    y += blockHeight + 8;
  };
  write(`Lesson Ledger notes: ${courseTopic.trim() || "Lesson Ledger course"}`, 20, true);
  [...notes].sort((left, right) => left.createdAt - right.createdAt).forEach((note, index) => {
    write(`${index + 1}. ${note.roadmapModuleTitle || "Course lesson"}`, 14, true);
    write(`Lesson: ${note.lessonTitle || "Saved lesson"}`);
    write(`Timestamp: ${formatTimestamp(note.timestamp)}`);
    write(`Video: ${getTimestampedVideoUrl(note.videoUrl, note.timestamp) || "Link unavailable for an older saved note"}`);
    write(`Note: ${note.text}`);
  });
  pdf.save(getNotesExportFileName(courseTopic, "pdf"));
}

export async function downloadNotesExport(format: NotesExportFormat, courseTopic: string, notes: TimestampedNote[]) {
  if (format === "pdf") {
    await downloadPdf(courseTopic, notes);
    return;
  }
  if (format === "png") {
    triggerBlobDownload(await createNotesPng(courseTopic, notes), getNotesExportFileName(courseTopic, "png"));
    return;
  }
  if (format === "doc") {
    triggerBlobDownload(new Blob(["\ufeff", formatNotesDocHtml(courseTopic, notes)], { type: "application/msword;charset=utf-8" }), getNotesExportFileName(courseTopic, "doc"));
    return;
  }
  triggerBlobDownload(new Blob([formatNotesText(courseTopic, notes)], { type: "text/plain;charset=utf-8" }), getNotesExportFileName(courseTopic, "txt"));
}
