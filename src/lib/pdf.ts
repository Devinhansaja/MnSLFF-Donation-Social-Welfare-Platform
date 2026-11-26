import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

const FOREST = rgb(0x18 / 255, 0x5c / 255, 0x44 / 255);
const NAVY = rgb(0x17 / 255, 0x2c / 255, 0x3b / 255);
const MUTED = rgb(0x64 / 255, 0x74 / 255, 0x8b / 255);
const GOLD = rgb(0xe8 / 255, 0xb6 / 255, 0x5a / 255);

/** pdf-lib standard fonts are WinAnsi only; strip characters they can't encode. */
const safe = (s: string) =>
  s
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/›/g, ">")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ]/g, "");

export class SimplePdf {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  serif!: PDFFont;
  y = 0;
  static async create(title: string) {
    const p = new SimplePdf();
    p.doc = await PDFDocument.create();
    p.doc.setTitle(title);
    p.doc.setAuthor("Minnesota Sri Lanka Friendship Foundation");
    p.font = await p.doc.embedFont(StandardFonts.Helvetica);
    p.bold = await p.doc.embedFont(StandardFonts.HelveticaBold);
    p.serif = await p.doc.embedFont(StandardFonts.TimesRomanBold);
    try {
      p.logo = await p.doc.embedPng(await readFile(path.join(process.cwd(), "public/brand/mark-white.png")));
    } catch {}
    p.newPage();
    return p;
  }
  logo?: PDFImage;
  newPage() {
    this.page = this.doc.addPage([595, 842]);
    this.page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: FOREST });
    if (this.logo) this.page.drawImage(this.logo, { x: 40, y: 799, width: 46, height: 36 });
    this.page.drawText("Minnesota Sri Lanka Friendship Foundation", { x: 96, y: 818, size: 12, font: this.serif, color: rgb(1, 1, 1) });
    this.page.drawText("Every project is visible. Every donation is accountable.", { x: 96, y: 803, size: 8, font: this.font, color: GOLD });
    this.y = 750;
  }
  ensure(space: number) {
    if (this.y - space < 60) return this.newPage();
  }
  title(t: string) {
    this.page.drawText(safe(t), { x: 40, y: this.y, size: 20, font: this.serif, color: NAVY });
    this.y -= 28;
  }
  text(t: string, opts: { size?: number; bold?: boolean; color?: "muted" | "forest"; x?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const color = opts.color === "muted" ? MUTED : opts.color === "forest" ? FOREST : NAVY;
    const maxWidth = 515 - (opts.x ?? 0);
    for (const line of wrap(safe(t), font, size, maxWidth)) {
      this.page.drawText(line, { x: 40 + (opts.x ?? 0), y: this.y, size, font, color });
      this.y -= size + 4;
    }
  }
  gap(n = 10) {
    this.y -= n;
  }
  row(label: string, value: string, opts: { bold?: boolean } = {}) {
    this.page.drawText(safe(label), { x: 40, y: this.y, size: 10, font: this.font, color: MUTED });
    const f = opts.bold ? this.bold : this.font;
    const v = safe(value);
    this.page.drawText(v, { x: 555 - f.widthOfTextAtSize(v, 10), y: this.y, size: 10, font: f, color: NAVY });
    this.y -= 18;
  }
  rule() {
    this.page.drawLine({ start: { x: 40, y: this.y + 6 }, end: { x: 555, y: this.y + 6 }, thickness: 0.5, color: rgb(0.88, 0.87, 0.83) });
    this.y -= 6;
  }
  table(headers: string[], rows: string[][], widths: number[]) {
    const draw = (cells: string[], bold: boolean) => {
      let x = 40;
      cells.forEach((c, i) => {
        const f = bold ? this.bold : this.font;
        const right = i > 0 && i === cells.length - 1;
        let s = safe(c);
        while (f.widthOfTextAtSize(s, 9) > widths[i] - 6 && s.length > 3) s = s.slice(0, -4) + "...";
        this.page.drawText(s, { x: right ? x + widths[i] - f.widthOfTextAtSize(s, 9) : x, y: this.y, size: 9, font: f, color: bold ? MUTED : NAVY });
        x += widths[i];
      });
      this.y -= 15;
    };
    draw(headers, true);
    this.rule();
    for (const r of rows) {
      if (this.y < 70) {
        // continue table on next page
        this.newPage();
        draw(headers, true);
        this.rule();
      }
      draw(r, false);
    }
  }
  footer(note: string) {
    for (const p of this.doc.getPages()) p.drawText(safe(note), { x: 40, y: 30, size: 7, font: this.font, color: MUTED });
  }
  async bytes() {
    return this.doc.save();
  }
}

function wrap(text: string, font: PDFFont, size: number, max: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > max && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}
