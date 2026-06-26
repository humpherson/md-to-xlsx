export const MAX_ITEMS = 10;
const INVEST_COLUMNS = [
  { key: 'independant', header: 'INVEST - Independant', label: 'Independent' },
  { key: 'negotiable', header: 'INVEST - Negotiable', label: 'Negotiable' },
  { key: 'valuable', header: 'INVEST - Valuable', label: 'Valuable' },
  { key: 'estimable', header: 'INVEST - Estimable', label: 'Estimable' },
  { key: 'small', header: 'INVEST - Small', label: 'Small' },
  { key: 'testable', header: 'INVEST - Testable', label: 'Testable' },
];

const HEADER_FONT = { name: 'Arial', bold: true, color: { argb: 'FFFFFF' }, size: 10 };
const ROW_FONT = { name: 'Arial', size: 9 };
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E4057' } };
const GROUP_FILLS = {
  fixed: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF2F7' } },
  ac: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E7' } },
  invest: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1ECFF' } },
  assume: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EDFAF1' } },
  question: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EAF4FB' } },
  gap: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF9E7' } },
  rec: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9EBEA' } },
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n');
}

export function stripMd(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').trim();
}

export function extractField(block, label) {
  const pattern = new RegExp(`\\*\\*${escapeRegex(label)}:\\*\\*\\s*(.+)`);
  const match = block.match(pattern);
  return match ? match[1].trim() : '';
}

export function extractSectionLines(block, heading) {
  const pattern = new RegExp(`### ${escapeRegex(heading)}\\n([\\s\\S]*?)(?=\\n###|$)`);
  const match = block.match(pattern);
  if (!match) {
    return [];
  }
  return match[1]
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractNarrative(block) {
  return extractSectionLines(block, 'Narrative').map(stripMd).join(' ');
}

export function extractBusinessValue(block) {
  return stripMd(extractSectionLines(block, 'Business Value').join(' '));
}

export function extractInvest(block) {
  return extractSectionLines(block, 'INVEST Assessment').map(stripMd).join('\n');
}

export function extractInvestColumns(block) {
  const lines = extractSectionLines(block, 'INVEST Assessment');
  const output = Object.fromEntries(INVEST_COLUMNS.map((column) => [column.key, '']));

  for (const line of lines) {
    const clean = stripMd(line);
    const match = clean.match(/^([✓✗✘✕])\s*(Independent|Negotiable|Valuable|Estimable|Small|Testable)\s*[—-]\s*(.+)$/);
    if (!match) {
      continue;
    }

    const [, icon, label, value] = match;
    const column = INVEST_COLUMNS.find((entry) => entry.label === label);
    if (column) {
      const cleanValue = value.trim();
      output[column.key] = cleanValue && cleanValue.toLowerCase() !== 'undefined' ? `${icon} ${cleanValue}` : icon;
    }
  }

  return output;
}

export function extractNumberedItems(block, heading, maxItems = MAX_ITEMS) {
  return extractSectionLines(block, heading)
    .map((line) => stripMd(line.replace(/^[-\u2022]\s*/, '')))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function extractAcs(block, maxAcs = MAX_ITEMS) {
  const match = block.match(/### Acceptance Criteria\n([\s\S]*?)(?=\n###|$)/);
  if (!match) {
    return [];
  }

  return match[1]
    .trim()
    .split(/(?=\*\*AC \d+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => stripMd(part).replace(/\s+/g, ' ').trim())
    .slice(0, maxAcs);
}

export function parseBlock(block) {
  const titleMatch = block.match(/^## (.+)/);
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    type: extractField(block, 'Type'),
    tag: extractField(block, 'Tag'),
    source: extractField(block, 'Source'),
    saved: extractField(block, 'Saved'),
    story: extractNarrative(block),
    acs: extractAcs(block),
    business_value: extractBusinessValue(block),
    invest: extractInvestColumns(block),
    assumptions: extractNumberedItems(block, 'Assumptions'),
    open_questions: extractNumberedItems(block, 'Open Questions'),
    flagged_gaps: extractNumberedItems(block, 'Flagged Gaps'),
    recommendations: extractNumberedItems(block, 'Additional Recommendations'),
  };
}

export function parseSections(text) {
  const blocks = normalizeText(text).split(/\n---+\n/);
  return blocks
    .map((block) => block.trim())
    .filter((block) => block.startsWith('## '))
    .map(parseBlock);
}

export function buildHeaders() {
  const fixed = ['Title', 'Type', 'Tag', 'Source', 'Saved', 'Story', 'Business Value'];
  const acCols = Array.from({ length: MAX_ITEMS }, (_, index) => `AC ${index + 1}`);
  const investCols = INVEST_COLUMNS.map((column) => column.header);
  const assumptionCols = Array.from({ length: MAX_ITEMS }, (_, index) => `Assumption ${index + 1}`);
  const questionCols = Array.from({ length: MAX_ITEMS }, (_, index) => `Open Question ${index + 1}`);
  const gapCols = Array.from({ length: MAX_ITEMS }, (_, index) => `Flagged Gap ${index + 1}`);
  const recCols = Array.from({ length: MAX_ITEMS }, (_, index) => `Recommendation ${index + 1}`);
  return [...fixed, ...acCols, ...investCols, ...assumptionCols, ...questionCols, ...gapCols, ...recCols];
}

function groupForHeader(header) {
  if (header.startsWith('AC ')) return 'ac';
  if (header.startsWith('INVEST - ')) return 'invest';
  if (header.startsWith('Assumption ')) return 'assume';
  if (header.startsWith('Open Question ')) return 'question';
  if (header.startsWith('Flagged Gap ')) return 'gap';
  if (header.startsWith('Recommendation ')) return 'rec';
  return 'fixed';
}

function sectionToRow(section, headers) {
  const row = Object.fromEntries(headers.map((header) => [header, '']));
  row.Title = section.title;
  row.Type = section.type;
  row.Tag = section.tag;
  row.Source = section.source;
  row.Saved = section.saved;
  row.Story = section.story;
  row['Business Value'] = section.business_value;
  INVEST_COLUMNS.forEach((column) => {
    row[column.header] = section.invest[column.key] ?? '';
  });

  section.acs.forEach((value, index) => {
    row[`AC ${index + 1}`] = value;
  });
  section.assumptions.forEach((value, index) => {
    row[`Assumption ${index + 1}`] = value;
  });
  section.open_questions.forEach((value, index) => {
    row[`Open Question ${index + 1}`] = value;
  });
  section.flagged_gaps.forEach((value, index) => {
    row[`Flagged Gap ${index + 1}`] = value;
  });
  section.recommendations.forEach((value, index) => {
    row[`Recommendation ${index + 1}`] = value;
  });

  return headers.map((header) => row[header]);
}

export async function createWorkbook(sections) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stories');
  const headers = buildHeaders();
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'CCCCCC' } },
    left: { style: 'thin', color: { argb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
    right: { style: 'thin', color: { argb: 'CCCCCC' } },
  };
  const wrapAlignment = { vertical: 'top', wrapText: true };
  const nowrapAlignment = { vertical: 'top', wrapText: false };

  worksheet.addRow(headers);
  worksheet.getRow(1).height = 32;
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  headers.forEach((header, index) => {
    const cell = worksheet.getRow(1).getCell(index + 1);
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  sections.forEach((section) => {
    const values = sectionToRow(section, headers);
    const row = worksheet.addRow(values);
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      cell.font = ROW_FONT;
      cell.fill = GROUP_FILLS[groupForHeader(header)];
      cell.border = thinBorder;
      cell.alignment =
        header === 'Title' ||
        header === 'Story' ||
        header === 'Business Value' ||
        header.startsWith('INVEST - ') ||
        header.startsWith('AC ') ||
        header.startsWith('Assumption ') ||
        header.startsWith('Open Question ') ||
        header.startsWith('Flagged Gap ') ||
        header.startsWith('Recommendation ')
          ? wrapAlignment
          : nowrapAlignment;
    });
  });

  const widths = {
    Title: 40,
    Type: 14,
    Tag: 16,
    Source: 22,
    Saved: 14,
    Story: 50,
    'Business Value': 40,
    'INVEST - Independant': 28,
    'INVEST - Negotiable': 28,
    'INVEST - Valuable': 28,
    'INVEST - Estimable': 28,
    'INVEST - Small': 28,
    'INVEST - Testable': 28,
  };

  headers.forEach((header, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = widths[header] ?? (header.startsWith('AC ') ? 40 : 35);
  });

  return workbook;
}

export async function workbookToBuffer(workbook) {
  return workbook.xlsx.writeBuffer();
}
let excelJsModulePromise;

async function loadExcelJS() {
  if (!excelJsModulePromise) {
    excelJsModulePromise = import('exceljs');
  }
  const module = await excelJsModulePromise;
  return module.default ?? module;
}
