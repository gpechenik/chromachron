import * as vscode from 'vscode';

// ============================================================
// Regex
// ============================================================
// Dates: YYYY-MM-DD
const DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
// Times: HH:mm (24h)
const TIME_RE = /(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g;
// Weekday names (long and short)
const WEEKDAY_RE =
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues?|Wed|Thurs?|Fri|Sat|Sun)\b/gi;
// Timezone abbreviations (conservative list to avoid matching random 3-letter words)
const TZ_ABBR_RE =
  /\b(UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|AKST|AKDT|HST|HDT|BST|CET|CEST|EET|EEST|IST|JST|KST|AEST|AEDT|ACST|ACDT|AWST|NZST|NZDT|WET|WEST|MSK|AST|ADT|NST|NDT|CAT|EAT|WAT|SAST|ART|BRT|CLT)\b/g;
// Timezone offsets: +HH:MM, -HH:MM, +HHMM, -HHMM, Z
const TZ_OFFSET_RE = /(?<![\w\d])([+-](?:\d{2}:?\d{2})|Z)(?![\w\d])/g;
// Hashtags: #followed directly by a letter (avoids markdown headers)
const HASHTAG_RE = /(?<![\w&])#([A-Za-z][\w/-]*)/g;
// Inline code: `code` (not empty, not spanning newlines)
const CODE_RE = /`[^`\n]+`/g;
// Links: [text](url) OR bare http(s) URL
const LINK_RE = /(\[[^\]\n]+\]\([^)\n]+\))|(https?:\/\/[^\s)>\]]+)/g;

// ============================================================
// Color utils
// ============================================================
type HSL = [number, number, number];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToRgb(hex: string): [number, number, number] | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hexToHsl(hex: string): HSL | undefined {
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  return rgbToHsl(rgb[0], rgb[1], rgb[2]);
}

function hexToColor(hex: string): vscode.Color | undefined {
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  return new vscode.Color(rgb[0], rgb[1], rgb[2], 1);
}

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Hue interpolation along the shortest arc on the color wheel.
function lerpHue(a: number, b: number, t: number): number {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

// Interpolate between two hex colors via HSL.
function interpolateHex(c1: string, c2: string, t: number, fallback = '#808080'): string {
  const a = hexToHsl(c1);
  const b = hexToHsl(c2);
  if (!a || !b) return fallback;
  const h = lerpHue(a[0], b[0], t);
  const s = lerp(a[1], b[1], t);
  const l = lerp(a[2], b[2], t);
  return hslToHex(h, s, l);
}

// ============================================================
// Config
// ============================================================
interface SectionColor {
  enabled: boolean;
  color: string;
  bold: boolean;
}

interface Config {
  scopeGlobs: string[];
  time: {
    enabled: boolean;
    showSquare: boolean;
    midnightColor: string;
    noonColor: string;
    bold: boolean;
  };
  date: {
    enabled: boolean;
    showSquare: boolean;
    preset: string;
    customColors: Record<string, string>;
    winterColor: string;
    summerColor: string;
    workdayColor: string;
    weekendColor: string;
    hemisphere: 'north' | 'south';
    bold: boolean;
  };
  weekday: {
    enabled: boolean;
    preset: string;
    customColors: Record<string, string>;
    workdayColor: string;
    weekendColor: string;
    bold: boolean;
  };
  timezone: SectionColor;
  hashtag: SectionColor;
  code: SectionColor;
  links: { enabled: boolean; color: string };
  perf: { visibleOnly: boolean; debounce: number };
}

function readConfig(): Config {
  const c = vscode.workspace.getConfiguration('chromachron');
  const getSec = (name: string, defaultColor: string): SectionColor => ({
    enabled: c.get<boolean>(`${name}.enabled`, true),
    color: c.get<string>(`${name}.color`, defaultColor),
    bold: c.get<boolean>(`${name}.bold`, false),
  });
  return {
    scopeGlobs: c.get<string[]>('scope.enabledGlobs', ['**/*.chron', '**/*.chron.md', '**/*.log.md']),
    time: {
      enabled: c.get<boolean>('time.enabled', true),
      showSquare: c.get<boolean>('time.showColorSquare', true),
      midnightColor: c.get<string>('time.midnightColor', '#2e3b73'),
      noonColor: c.get<string>('time.noonColor', '#f5c842'),
      bold: c.get<boolean>('time.bold', false),
    },
    date: {
      enabled: c.get<boolean>('date.enabled', true),
      showSquare: c.get<boolean>('date.showColorSquare', true),
      preset: c.get<string>('date.preset', 'seasonal'),
      customColors: c.get<Record<string, string>>('date.colors', {}),
      winterColor: c.get<string>('date.winterColor', '#2e3b73'),
      summerColor: c.get<string>('date.summerColor', '#f5c842'),
      workdayColor: c.get<string>('date.workdayColor', '#6b7280'),
      weekendColor: c.get<string>('date.weekendColor', '#f5c842'),
      hemisphere: c.get<'north' | 'south'>('date.hemisphere', 'north'),
      bold: c.get<boolean>('date.bold', false),
    },
    weekday: {
      enabled: c.get<boolean>('weekday.enabled', true),
      preset: c.get<string>('weekday.preset', 'rainbow'),
      customColors: c.get<Record<string, string>>('weekday.colors', {}),
      workdayColor: c.get<string>('weekday.workdayColor', '#6b7280'),
      weekendColor: c.get<string>('weekday.weekendColor', '#f5c842'),
      bold: c.get<boolean>('weekday.bold', false),
    },
    timezone: getSec('timezone', '#a58fc9'),
    hashtag: getSec('hashtag', '#6b7280'),
    code: getSec('code', '#6b7280'),
    links: {
      enabled: c.get<boolean>('links.enabled', true),
      color: c.get<string>('links.color', '#61afef'),
    },
    perf: {
      visibleOnly: c.get<boolean>('perf.visibleRangeOnly', true),
      debounce: c.get<number>('perf.debounceMs', 100),
    },
  };
}

// ============================================================
// Day-of-week color presets (used by date.preset and weekday.preset)
// JS getDay(): 0=Sun, 1=Mon, …, 6=Sat
// ============================================================
const DOW_PRESETS: Record<string, Record<number, HSL>> = {
  rainbow: {
    1: [0, 75, 55], 2: [28, 85, 55], 3: [52, 85, 50],
    4: [125, 55, 45], 5: [210, 70, 55], 6: [260, 55, 60], 0: [300, 55, 60],
  },
  pastel: {
    1: [0, 55, 75], 2: [30, 60, 75], 3: [55, 60, 72],
    4: [120, 40, 72], 5: [210, 55, 75], 6: [260, 45, 78], 0: [300, 45, 78],
  },
  muted: {
    1: [0, 25, 58], 2: [30, 30, 58], 3: [52, 30, 55],
    4: [120, 22, 52], 5: [210, 28, 58], 6: [260, 22, 60], 0: [300, 22, 60],
  },
  warmCool: {
    1: [15, 70, 55], 2: [35, 75, 55], 3: [50, 70, 55],
    4: [180, 55, 55], 5: [210, 60, 55], 6: [240, 50, 55], 0: [270, 50, 55],
  },
};

const DOW_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DOW_FROM_WORD: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function dowColor(
  preset: string,
  custom: Record<string, string>,
  dow: number,
  workdayColor?: string,
  weekendColor?: string,
): string | undefined {
  if (preset === 'workweek') {
    const isWeekend = dow === 0 || dow === 6;
    return isWeekend ? weekendColor : workdayColor;
  }
  if (preset === 'custom') {
    const hex = custom[DOW_NAMES[dow]];
    if (!hex) return undefined;
    const h = hex.startsWith('#') ? hex : `#${hex}`;
    return /^#[0-9a-f]{6}$/i.test(h) ? h : undefined;
  }
  const p = DOW_PRESETS[preset] ?? DOW_PRESETS.rainbow;
  const [h, s, l] = p[dow];
  return hslToHex(h, s, l);
}

// ============================================================
// Seasonal date color — midsummer bright, midwinter dark.
// Uses a tent function centered on the summer solstice (N hemisphere).
// ============================================================
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function seasonalColor(cfg: Config, y: number, m: number, d: number): string {
  const dt = Date.UTC(y, m - 1, d);
  const jan1 = Date.UTC(y, 0, 1);
  const dayOfYear = Math.floor((dt - jan1) / 86400000); // 0-based
  const total = isLeapYear(y) ? 366 : 365;
  // Day-of-year for the two solstices. Approximations — close enough that
  // tuning day-by-day wouldn't be visible.
  const summerDOY = 171; // ~June 21
  const winterDOY = 355; // ~Dec 21
  const anchorSummer = cfg.date.hemisphere === 'south' ? winterDOY : summerDOY;
  // Distance from the "bright" anchor, normalized to [0, 0.5]
  let rawDist = Math.abs(dayOfYear - anchorSummer);
  if (rawDist > total / 2) rawDist = total - rawDist;
  const fromSummer = rawDist / (total / 2); // 0 at bright anchor, 1 at opposite
  const t = 1 - fromSummer; // 1 at bright, 0 at dark
  return interpolateHex(cfg.date.winterColor, cfg.date.summerColor, t);
}

// ============================================================
// Date color (dispatch)
// ============================================================
function dateColor(cfg: Config, y: number, m: number, d: number): string | undefined {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) return undefined;

  if (cfg.date.preset === 'seasonal') return seasonalColor(cfg, y, m, d);
  return dowColor(
    cfg.date.preset,
    cfg.date.customColors,
    dt.getUTCDay(),
    cfg.date.workdayColor,
    cfg.date.weekendColor,
  );
}

// ============================================================
// Time color — interpolate midnight ↔ noon via tent on day fraction.
// fromMidnight = 0 at 00:00, 1 at 12:00, back to 0 at 24:00.
// ============================================================
function timeColor(cfg: Config, hh: number, mm: number): string {
  const dayFraction = (hh + mm / 60) / 24;
  const fromMidnight = 1 - Math.abs(2 * dayFraction - 1);
  return interpolateHex(cfg.time.midnightColor, cfg.time.noonColor, fromMidnight);
}

// ============================================================
// Decoration pool — one TextEditorDecorationType per (color, bold).
// ============================================================
class DecorationPool {
  private map = new Map<string, vscode.TextEditorDecorationType>();

  get(color: string, bold: boolean): vscode.TextEditorDecorationType {
    const key = `${color}|${bold ? 'b' : 'r'}`;
    let t = this.map.get(key);
    if (!t) {
      t = vscode.window.createTextEditorDecorationType({
        color,
        fontWeight: bold ? 'bold' : undefined,
      });
      this.map.set(key, t);
    }
    return t;
  }

  dispose() {
    for (const t of this.map.values()) t.dispose();
    this.map.clear();
  }
}

// ============================================================
// Match extraction
// ============================================================
type Kind = 'time' | 'date' | 'weekday' | 'timezone' | 'hashtag' | 'code' | 'link';

interface Match {
  range: vscode.Range;
  color: string;
  kind: Kind;
  bold: boolean;
}

function scanRange(
  doc: vscode.TextDocument,
  scanRange: vscode.Range,
  cfg: Config,
): Match[] {
  const text = doc.getText(scanRange);
  const baseOffset = doc.offsetAt(scanRange.start);
  const out: Match[] = [];

  const toRange = (start: number, len: number) => {
    const s = doc.positionAt(baseOffset + start);
    const e = doc.positionAt(baseOffset + start + len);
    return new vscode.Range(s, e);
  };

  const push = (re: RegExp, kind: Kind, colorFn: (m: RegExpExecArray) => string | undefined, bold: boolean) => {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text)); ) {
      const color = colorFn(m);
      if (color) out.push({ range: toRange(m.index, m[0].length), color, kind, bold });
    }
  };

  if (cfg.date.enabled) {
    push(DATE_RE, 'date', m => dateColor(cfg, +m[1], +m[2], +m[3]), cfg.date.bold);
  }
  if (cfg.time.enabled) {
    push(TIME_RE, 'time', m => timeColor(cfg, +m[1], +m[2]), cfg.time.bold);
  }
  if (cfg.weekday.enabled) {
    push(WEEKDAY_RE, 'weekday', m => {
      const dow = DOW_FROM_WORD[m[1].toLowerCase()];
      if (dow === undefined) return undefined;
      return dowColor(
        cfg.weekday.preset,
        cfg.weekday.customColors,
        dow,
        cfg.weekday.workdayColor,
        cfg.weekday.weekendColor,
      );
    }, cfg.weekday.bold);
  }
  if (cfg.timezone.enabled) {
    push(TZ_ABBR_RE, 'timezone', () => cfg.timezone.color, cfg.timezone.bold);
    push(TZ_OFFSET_RE, 'timezone', () => cfg.timezone.color, cfg.timezone.bold);
  }
  if (cfg.hashtag.enabled) {
    push(HASHTAG_RE, 'hashtag', () => cfg.hashtag.color, cfg.hashtag.bold);
  }
  if (cfg.code.enabled) {
    push(CODE_RE, 'code', () => cfg.code.color, cfg.code.bold);
  }
  if (cfg.links.enabled) {
    push(LINK_RE, 'link', () => cfg.links.color, false);
  }

  return out;
}

function scanDocument(doc: vscode.TextDocument, editor: vscode.TextEditor | undefined, cfg: Config): Match[] {
  if (cfg.perf.visibleOnly && editor && editor.visibleRanges.length) {
    const out: Match[] = [];
    for (const r of editor.visibleRanges) {
      const padded = new vscode.Range(
        new vscode.Position(Math.max(0, r.start.line - 50), 0),
        new vscode.Position(Math.min(doc.lineCount - 1, r.end.line + 50), 0),
      );
      out.push(...scanRange(doc, padded, cfg));
    }
    return out;
  }
  const full = new vscode.Range(
    new vscode.Position(0, 0),
    doc.lineAt(doc.lineCount - 1).range.end,
  );
  return scanRange(doc, full, cfg);
}

// ============================================================
// Scope check
// ============================================================
function inScope(doc: vscode.TextDocument, cfg: Config): boolean {
  if (!cfg.scopeGlobs.length) return true;
  for (const g of cfg.scopeGlobs) {
    const score = vscode.languages.match({ pattern: g }, doc);
    if (score > 0) return true;
  }
  return false;
}

// ============================================================
// Applier — manages decorations per editor
// ============================================================
class Applier implements vscode.Disposable {
  private pool = new DecorationPool();
  private timers = new WeakMap<vscode.TextEditor, NodeJS.Timeout>();
  private lastTypes = new WeakMap<vscode.TextEditor, Set<vscode.TextEditorDecorationType>>();

  constructor(private getCfg: () => Config) {}

  schedule(editor: vscode.TextEditor) {
    const cfg = this.getCfg();
    const prev = this.timers.get(editor);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.timers.delete(editor);
      this.apply(editor, cfg);
    }, cfg.perf.debounce);
    this.timers.set(editor, t);
  }

  apply(editor: vscode.TextEditor, cfg: Config) {
    if (editor.document.languageId !== 'chron') return;
    if (!inScope(editor.document, cfg)) return;

    const matches = scanDocument(editor.document, editor, cfg);

    const byType = new Map<vscode.TextEditorDecorationType, vscode.Range[]>();
    for (const m of matches) {
      const type = this.pool.get(m.color, m.bold);
      const arr = byType.get(type) ?? [];
      arr.push(m.range);
      byType.set(type, arr);
    }

    const prevSet = this.lastTypes.get(editor);
    if (prevSet) {
      for (const t of prevSet) {
        if (!byType.has(t)) editor.setDecorations(t, []);
      }
    }

    const nowSet = new Set<vscode.TextEditorDecorationType>();
    for (const [type, ranges] of byType) {
      editor.setDecorations(type, ranges);
      nowSet.add(type);
    }
    this.lastTypes.set(editor, nowSet);
  }

  resetAll() {
    this.pool.dispose();
    this.lastTypes = new WeakMap();
  }

  dispose() {
    this.pool.dispose();
  }
}

// ============================================================
// Color provider — draws clickable color squares for dates and times.
// ============================================================
class LogMdColorProvider implements vscode.DocumentColorProvider {
  constructor(private getCfg: () => Config) {}

  provideDocumentColors(doc: vscode.TextDocument): vscode.ColorInformation[] {
    const cfg = this.getCfg();
    if (!inScope(doc, cfg)) return [];
    const wantTime = cfg.time.enabled && cfg.time.showSquare;
    const wantDate = cfg.date.enabled && cfg.date.showSquare;
    if (!wantTime && !wantDate) return [];

    const subCfg: Config = {
      ...cfg,
      time: { ...cfg.time, enabled: wantTime },
      date: { ...cfg.date, enabled: wantDate },
      weekday: { ...cfg.weekday, enabled: false },
      timezone: { ...cfg.timezone, enabled: false },
      hashtag: { ...cfg.hashtag, enabled: false },
      code: { ...cfg.code, enabled: false },
      links: { ...cfg.links, enabled: false },
    };

    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      doc.lineAt(doc.lineCount - 1).range.end,
    );
    const matches = scanRange(doc, fullRange, subCfg);
    const out: vscode.ColorInformation[] = [];
    for (const m of matches) {
      if (m.kind !== 'time' && m.kind !== 'date') continue;
      const c = hexToColor(m.color);
      if (c) out.push(new vscode.ColorInformation(m.range, c));
    }
    return out;
  }

  provideColorPresentations(
    _color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
  ): vscode.ColorPresentation[] {
    const original = context.document.getText(context.range);
    return [new vscode.ColorPresentation(original)];
  }
}

// ============================================================
// activate / deactivate
// ============================================================
export function activate(context: vscode.ExtensionContext) {
  let cfg = readConfig();
  const applier = new Applier(() => cfg);

  const onEditor = (editor: vscode.TextEditor | undefined) => {
    if (!editor || editor.document.languageId !== 'chron') return;
    if (!inScope(editor.document, cfg)) return;
    applier.schedule(editor);
  };

  context.subscriptions.push(
    applier,
    vscode.window.onDidChangeActiveTextEditor(onEditor),
    vscode.window.onDidChangeVisibleTextEditors(eds => {
      for (const e of eds) onEditor(e);
    }),
    vscode.workspace.onDidChangeTextDocument(e => {
      for (const ed of vscode.window.visibleTextEditors) {
        if (ed.document === e.document) onEditor(ed);
      }
    }),
    vscode.window.onDidChangeTextEditorVisibleRanges(e => {
      if (cfg.perf.visibleOnly) onEditor(e.textEditor);
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (!e.affectsConfiguration('chromachron')) return;
      cfg = readConfig();
      applier.resetAll();
      for (const ed of vscode.window.visibleTextEditors) onEditor(ed);
    }),
    vscode.languages.registerColorProvider(
      { language: 'chron' },
      new LogMdColorProvider(() => cfg),
    ),
  );

  for (const ed of vscode.window.visibleTextEditors) onEditor(ed);
}

export function deactivate() {}
