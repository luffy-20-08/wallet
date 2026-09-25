const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Paths to bundled Unicode fonts supporting Indian Rupee symbol (₹ / U+20B9)
const FONT_REGULAR_PATH = path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, 'fonts', 'NotoSans-Bold.ttf');

// Explicit standard font imports to ensure serverless bundlers (such as @vercel/nft on Vercel)
// package the necessary font definitions and metrics with the lambda function.
try {
    require('pdfkit/standard-fonts/Helvetica');
    require('pdfkit/standard-fonts/HelveticaBold');
    require('pdfkit/standard-fonts/HelveticaOblique');
    require('pdfkit/standard-fonts/HelveticaBoldOblique');
    require('pdfkit/standard-fonts/Courier');
    require('pdfkit/standard-fonts/CourierBold');
    require('pdfkit/standard-fonts/TimesRoman');
    require('pdfkit/standard-fonts/TimesBold');
} catch (e) {
    // Non-fatal if standard-fonts are resolved differently in custom environments
}

// Friendly category labels and icons matching frontend
const CATEGORY_MAP = {
    'Food': 'Food & Dining',
    'Transport': 'Transportation',
    'Shopping': 'Shopping',
    'Bills': 'Bills & Utilities',
    'Entertainment': 'Entertainment',
    'Health': 'Health & Fitness',
    'Investment': 'Investment',
    'Salary': 'Salary/Income',
    'General': 'General'
};

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get category display label
 */
function getCategoryLabel(catKey) {
    if (!catKey) return 'General';
    return CATEGORY_MAP[catKey] || catKey;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDateISO(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Format currency for text/PDF
 */
function formatCurrency(amount) {
    const num = Math.abs(Number(amount) || 0);
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Compute report summary metrics
 */
function computeSummary(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
        const val = Number(t.amount) || 0;
        if (t.type === 'income' || val > 0) {
            totalIncome += Math.abs(val);
        } else {
            totalExpenses += Math.abs(val);
        }
    });

    const netBalance = totalIncome - totalExpenses;
    const count = transactions.length;

    return {
        totalIncome,
        totalExpenses,
        netBalance,
        count
    };
}

/**
 * Derive human-readable period description from filter params
 */
function getPeriodDescription(options = {}) {
    if (options.scope === 'all' || options.month === 'lifetime') {
        return 'All Time (Lifetime)';
    }
    if (options.date) {
        return `Date: ${options.date}`;
    }
    if (options.startDate && options.endDate) {
        return `${options.startDate} to ${options.endDate}`;
    }
    if (options.month !== undefined && options.month !== null && options.month !== 'all') {
        const mIdx = parseInt(options.month, 10);
        const mName = !isNaN(mIdx) && MONTH_NAMES[mIdx] ? MONTH_NAMES[mIdx] : 'Selected Month';
        const yr = options.year || new Date().getFullYear();
        return `${mName} ${yr}`;
    }
    if (options.year) {
        return `Year ${options.year}`;
    }
    return 'All Time';
}

/**
 * Generate standard file name for export
 */
function getExportFileName(format, options = {}) {
    const ext = format === 'excel' || format === 'xlsx' ? 'xlsx' : format.toLowerCase();
    const prefix = format === 'pdf' ? 'Wallet_Report' : 'Wallet_Transactions';

    if (options.scope === 'all' || options.month === 'lifetime') {
        return `${prefix}_All.${ext}`;
    }
    if (options.date) {
        return `${prefix}_${options.date}.${ext}`;
    }
    if (options.startDate && options.endDate) {
        return `${prefix}_${options.startDate}_to_${options.endDate}.${ext}`;
    }
    if (options.month !== undefined && options.month !== null && options.month !== 'all') {
        const mIdx = parseInt(options.month, 10);
        const mName = !isNaN(mIdx) && MONTH_NAMES[mIdx] ? MONTH_NAMES[mIdx] : 'Month';
        const yr = options.year || new Date().getFullYear();
        return `${prefix}_${mName}_${yr}.${ext}`;
    }
    if (options.year) {
        return `${prefix}_${options.year}.${ext}`;
    }
    return `${prefix}_All.${ext}`;
}

/**
 * ----------------------------------------------------
 * 1. CSV GENERATION (Safe RFC 4180 Escaping)
 * ----------------------------------------------------
 */
function escapeCSVField(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // If field contains comma, quote, or newline, escape quotes and wrap in quotes
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function generateCSV(transactions) {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const lines = [headers.join(',')];

    transactions.forEach(t => {
        const dateStr = formatDateISO(t.date || t.createdAt);
        const desc = t.text || '';
        const category = getCategoryLabel(t.category);
        const type = (t.type === 'expense' || t.amount < 0) ? 'Expense' : 'Income';
        // User spec example: positive number magnitude (e.g. 2500, 15000)
        const amount = Math.abs(Number(t.amount) || 0);

        const row = [
            escapeCSVField(dateStr),
            escapeCSVField(desc),
            escapeCSVField(category),
            escapeCSVField(type),
            amount
        ];
        lines.push(row.join(','));
    });

    return lines.join('\r\n');
}

/**
 * ----------------------------------------------------
 * 2. EXCEL GENERATION (.xlsx using exceljs)
 * ----------------------------------------------------
 */
async function generateExcel(transactions, options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wallet App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Transactions', {
        views: [{ state: 'frozen', ySplit: 8 }] // Freeze header row (Row 8)
    });

    const summary = computeSummary(transactions);
    const periodText = getPeriodDescription(options);

    // Style palette (Linear / Dark Fintech inspired sleek styling)
    const BRAND_DARK = '13111C';
    const PURPLE_ACCENT = 'A970FF';
    const PURPLE_LIGHT = 'F3E8FF';
    const HEADER_FILL = '1F1B2E';
    const TEXT_MUTED = '6B7280';
    const GREEN_TEXT = '00875A';
    const GREEN_FILL = 'E6F4EA';
    const RED_TEXT = 'DE350B';
    const RED_FILL = 'FFEBE6';
    const BORDER_COLOR = 'E5E7EB';

    // 1. Report Title (Row 1)
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Wallet Transaction Report';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: BRAND_DARK } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(1).height = 28;

    // 2. Report Subtitle / Period (Row 2)
    sheet.mergeCells('A2:E2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Period: ${periodText}  |  Generated on: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`;
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: TEXT_MUTED } };
    sheet.getRow(2).height = 18;

    // Blank row 3
    sheet.getRow(3).height = 8;

    // 3. Summary Cards Header (Row 4) & Values (Row 5)
    sheet.getCell('A4').value = 'Total Income';
    sheet.getCell('B4').value = 'Total Expenses';
    sheet.getCell('C4').value = 'Net Balance';
    sheet.getCell('D4').value = 'Transactions';
    sheet.getCell('E4').value = 'Status';

    ['A4', 'B4', 'C4', 'D4', 'E4'].forEach(addr => {
        const c = sheet.getCell(addr);
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: TEXT_MUTED } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
        c.border = {
            top: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
        };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(4).height = 20;

    // Row 5 Values
    const incCell = sheet.getCell('A5');
    incCell.value = summary.totalIncome;
    incCell.numFmt = '₹#,##0.00';
    incCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: GREEN_TEXT } };
    incCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FILL } };

    const expCell = sheet.getCell('B5');
    expCell.value = summary.totalExpenses;
    expCell.numFmt = '₹#,##0.00';
    expCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: RED_TEXT } };
    expCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } };

    const netCell = sheet.getCell('C5');
    netCell.value = summary.netBalance;
    netCell.numFmt = '₹#,##0.00';
    netCell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: summary.netBalance >= 0 ? GREEN_TEXT : RED_TEXT }
    };
    netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };

    const countCell = sheet.getCell('D5');
    countCell.value = summary.count;
    countCell.numFmt = '#,##0';
    countCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: BRAND_DARK } };
    countCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };

    const statusCell = sheet.getCell('E5');
    statusCell.value = summary.netBalance >= 0 ? 'Surplus' : 'Deficit';
    statusCell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: summary.netBalance >= 0 ? GREEN_TEXT : RED_TEXT }
    };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };

    ['A5', 'B5', 'C5', 'D5', 'E5'].forEach(addr => {
        const c = sheet.getCell(addr);
        c.border = {
            top: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
        };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(5).height = 24;

    // Blank rows 6 and 7
    sheet.getRow(6).height = 8;
    sheet.getRow(7).height = 8;

    // 4. Data Table Header (Row 8)
    const tableHeaders = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const headerRow = sheet.getRow(8);
    headerRow.values = tableHeaders;
    headerRow.height = 24;

    headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
        cell.border = {
            bottom: { style: 'medium', color: { argb: PURPLE_ACCENT } },
            top: { style: 'thin', color: { argb: BRAND_DARK } },
            left: { style: 'thin', color: { argb: BRAND_DARK } },
            right: { style: 'thin', color: { argb: BRAND_DARK } }
        };
        cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 5 ? 'right' : (colNumber === 4 || colNumber === 1 ? 'center' : 'left')
        };
    });

    // 5. Data Rows (Starting at Row 9)
    transactions.forEach((t, index) => {
        const rowNum = 9 + index;
        const row = sheet.getRow(rowNum);
        const isExp = t.type === 'expense' || t.amount < 0;
        const typeStr = isExp ? 'Expense' : 'Income';
        const catStr = getCategoryLabel(t.category);
        const amt = Math.abs(Number(t.amount) || 0);

        row.values = [
            formatDateISO(t.date || t.createdAt),
            t.text || '',
            catStr,
            typeStr,
            amt
        ];
        row.height = 20;

        const isEven = index % 2 === 0;
        const rowBg = isEven ? 'FFFFFF' : 'F9FAFB';

        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: '1F2937' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
                left: { style: 'thin', color: { argb: 'F3F4F6' } },
                right: { style: 'thin', color: { argb: 'F3F4F6' } }
            };

            if (colNumber === 1) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber === 2) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else if (colNumber === 3) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else if (colNumber === 4) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = {
                    name: 'Segoe UI',
                    size: 9.5,
                    bold: true,
                    color: { argb: isExp ? RED_TEXT : GREEN_TEXT }
                };
            } else if (colNumber === 5) {
                cell.numFmt = '₹#,##0.00';
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.font = {
                    name: 'Segoe UI',
                    size: 9.5,
                    bold: true,
                    color: { argb: isExp ? RED_TEXT : GREEN_TEXT }
                };
            }
        });
    });

    // Auto-fit Column Widths
    sheet.columns = [
        { key: 'date', width: 14 },
        { key: 'desc', width: 34 },
        { key: 'category', width: 24 },
        { key: 'type', width: 14 },
        { key: 'amount', width: 18 }
    ];

    return await workbook.xlsx.writeBuffer();
}

/**
 * ----------------------------------------------------
 * 3. PDF GENERATION (Professional Financial Report)
 * ----------------------------------------------------
 */
function generatePDF(transactions, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 36,
                bufferPages: true
            });

            // Register Unicode TrueType fonts (supports authentic Indian Rupee ₹ / U+20B9)
            // with resilient fallback to standard Helvetica
            let fontRegular = 'Helvetica';
            let fontBold = 'Helvetica-Bold';

            try {
                if (fs.existsSync(FONT_REGULAR_PATH) && fs.existsSync(FONT_BOLD_PATH)) {
                    doc.registerFont('NotoSans', FONT_REGULAR_PATH);
                    doc.registerFont('NotoSans-Bold', FONT_BOLD_PATH);
                    fontRegular = 'NotoSans';
                    fontBold = 'NotoSans-Bold';
                }
            } catch (fontErr) {
                console.warn('[PDF Export] Failed registering NotoSans fonts, falling back to Helvetica:', fontErr.message);
            }

            const buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const summary = computeSummary(transactions);
            const periodText = getPeriodDescription(options);
            const generatedAtStr = new Date().toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });

            // Modern Dark / Futuristic Palette
            const COLOR_BG_DARK = '#0D0D10';
            const COLOR_CARD = '#17171B';
            const COLOR_PURPLE = '#A970FF';
            const COLOR_PURPLE_LIGHT = '#D8B4FE';
            const COLOR_TEXT = '#F4F1F8';
            const COLOR_MUTED = '#9996A3';
            const COLOR_BORDER = '#262433';
            const COLOR_TEAL = '#00D9C0';
            const COLOR_CORAL = '#FF5C72';

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = 36;
            const contentWidth = pageWidth - (margin * 2);

            // Draw full background page on current page
            function drawPageBackground() {
                doc.save();
                doc.rect(0, 0, pageWidth, pageHeight).fill(COLOR_BG_DARK);
                doc.restore();
            }

            drawPageBackground();

            // ================= HEADER =================
            let currentY = margin;

            // Brand Logo Accent bar
            doc.roundedRect(margin, currentY, 4, 34, 2).fill(COLOR_PURPLE);

            // Brand Text
            doc.font(fontBold).fontSize(18).fillColor(COLOR_TEXT);
            doc.text('Wallet', margin + 12, currentY);

            doc.font(fontRegular).fontSize(9).fillColor(COLOR_MUTED);
            doc.text('Personal Finance & Expense Tracker', margin + 12, currentY + 20);

            // Right Header: Report Type & Period
            doc.font(fontBold).fontSize(14).fillColor(COLOR_PURPLE_LIGHT);
            doc.text('TRANSACTION REPORT', margin, currentY + 2, { align: 'right', width: contentWidth });

            doc.font(fontRegular).fontSize(9).fillColor(COLOR_MUTED);
            doc.text(`Period: ${periodText}`, margin, currentY + 18, { align: 'right', width: contentWidth });

            currentY += 46;

            // Subtle divider line
            doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
            currentY += 14;

            // ================= SUMMARY CARDS =================
            const cardWidth = (contentWidth - 24) / 4;
            const cardHeight = 52;

            const cards = [
                { label: 'TOTAL INCOME', value: `+${formatCurrency(summary.totalIncome)}`, color: COLOR_TEAL },
                { label: 'TOTAL EXPENSES', value: `-${formatCurrency(summary.totalExpenses)}`, color: COLOR_CORAL },
                {
                    label: 'NET BALANCE',
                    value: (summary.netBalance >= 0 ? '+' : '-') + formatCurrency(summary.netBalance),
                    color: summary.netBalance >= 0 ? COLOR_TEAL : COLOR_CORAL
                },
                { label: 'TRANSACTIONS', value: String(summary.count), color: COLOR_PURPLE_LIGHT }
            ];

            cards.forEach((card, i) => {
                const cardX = margin + (i * (cardWidth + 8));

                // Card background container
                doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6)
                    .fillAndStroke(COLOR_CARD, COLOR_BORDER);

                // Card label
                doc.font(fontBold).fontSize(7.5).fillColor(COLOR_MUTED);
                doc.text(card.label, cardX + 10, currentY + 10, { width: cardWidth - 20, align: 'left' });

                // Card value
                doc.font(fontBold).fontSize(11).fillColor(card.color);
                doc.text(card.value, cardX + 10, currentY + 26, { width: cardWidth - 20, align: 'left' });
            });

            currentY += cardHeight + 18;

            // ================= TRANSACTION TABLE =================
            const colWidths = {
                date: 72,
                desc: 195,
                category: 110,
                type: 64,
                amount: 82
            };

            function drawTableHeader(y) {
                // Header bar
                doc.roundedRect(margin, y, contentWidth, 22, 4).fill('#1F1B2E');

                doc.font(fontBold).fontSize(8).fillColor('#E2D9F3');

                let colX = margin + 8;
                doc.text('DATE', colX, y + 6, { width: colWidths.date });

                colX += colWidths.date;
                doc.text('DESCRIPTION', colX, y + 6, { width: colWidths.desc });

                colX += colWidths.desc;
                doc.text('CATEGORY', colX, y + 6, { width: colWidths.category });

                colX += colWidths.category;
                doc.text('TYPE', colX, y + 6, { width: colWidths.type, align: 'center' });

                colX += colWidths.type;
                doc.text('AMOUNT', colX, y + 6, { width: colWidths.amount - 16, align: 'right' });
            }

            drawTableHeader(currentY);
            currentY += 26;

            const rowHeight = 22;
            const bottomLimit = pageHeight - margin - 30;

            transactions.forEach((t, idx) => {
                // If nearing bottom of page, create new page
                if (currentY + rowHeight > bottomLimit) {
                    doc.addPage();
                    drawPageBackground();
                    currentY = margin + 10;
                    drawTableHeader(currentY);
                    currentY += 26;
                }

                const isEven = idx % 2 === 0;
                const rowBg = isEven ? '#121217' : '#17171D';
                const isExp = t.type === 'expense' || t.amount < 0;

                // Row background
                doc.rect(margin, currentY, contentWidth, rowHeight).fill(rowBg);

                // Row bottom subtle border
                doc.moveTo(margin, currentY + rowHeight)
                    .lineTo(margin + contentWidth, currentY + rowHeight)
                    .strokeColor(COLOR_BORDER)
                    .lineWidth(0.5)
                    .stroke();

                let colX = margin + 8;

                // Date
                doc.font(fontRegular).fontSize(8).fillColor(COLOR_MUTED);
                doc.text(formatDateISO(t.date || t.createdAt), colX, currentY + 6, { width: colWidths.date });

                // Description
                colX += colWidths.date;
                doc.font(fontRegular).fontSize(8).fillColor(COLOR_TEXT);
                const descText = String(t.text || 'Transaction').substring(0, 38);
                doc.text(descText, colX, currentY + 6, { width: colWidths.desc, ellipsis: true });

                // Category
                colX += colWidths.desc;
                doc.font(fontRegular).fontSize(8).fillColor(COLOR_MUTED);
                const catLabel = getCategoryLabel(t.category);
                doc.text(catLabel, colX, currentY + 6, { width: colWidths.category, ellipsis: true });

                // Type
                colX += colWidths.category;
                doc.font(fontBold).fontSize(7.5).fillColor(isExp ? COLOR_CORAL : COLOR_TEAL);
                doc.text(isExp ? 'Expense' : 'Income', colX, currentY + 6, { width: colWidths.type, align: 'center' });

                // Amount
                colX += colWidths.type;
                doc.font(fontBold).fontSize(8.5).fillColor(isExp ? COLOR_CORAL : COLOR_TEAL);
                const formattedAmt = (isExp ? '-' : '+') + formatCurrency(t.amount);
                doc.text(formattedAmt, colX, currentY + 6, { width: colWidths.amount - 16, align: 'right' });

                currentY += rowHeight;
            });

            // ================= FOOTER ON ALL PAGES =================
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);

                const footerY = pageHeight - margin + 6;

                // Subtle footer separator
                doc.moveTo(margin, footerY - 4)
                    .lineTo(margin + contentWidth, footerY - 4)
                    .strokeColor(COLOR_BORDER)
                    .lineWidth(0.7)
                    .stroke();

                doc.font(fontRegular).fontSize(7.5).fillColor(COLOR_MUTED);
                doc.text('Wallet  ·  Discipline today, freedom tomorrow', margin, footerY, { align: 'left' });

                doc.text(`Generated on ${generatedAtStr}  |  Page ${i + 1} of ${range.count}`, margin, footerY, {
                    align: 'right',
                    width: contentWidth
                });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}


/**
 * ----------------------------------------------------
 * 4. QUERY BUILDER (Enforces user isolation & filters)
 * ----------------------------------------------------
 */
function buildExportQuery(userId, queryParams = {}) {
    // STRICT SECURITY: Always enforce user and isDeleted: false
    const query = {
        user: userId,
        isDeleted: false
    };

    // If scope === 'all', export all active transactions for this user regardless of filters
    if (queryParams.scope === 'all') {
        return { query, sort: { date: -1, _id: -1 } };
    }

    // 1. Date / Period Filters
    if (queryParams.date) {
        // Specific day (YYYY-MM-DD)
        const parts = queryParams.date.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const start = new Date(y, m, d, 0, 0, 0, 0);
            const end = new Date(y, m, d, 23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }
    } else if (queryParams.startDate || queryParams.endDate) {
        query.date = {};
        if (queryParams.startDate) {
            query.date.$gte = new Date(queryParams.startDate);
        }
        if (queryParams.endDate) {
            const endD = new Date(queryParams.endDate);
            endD.setHours(23, 59, 59, 999);
            query.date.$lte = endD;
        }
    } else if (queryParams.month !== undefined && queryParams.month !== null && queryParams.month !== '' && queryParams.month !== 'lifetime') {
        const year = queryParams.year ? parseInt(queryParams.year, 10) : new Date().getFullYear();
        if (queryParams.month === 'all') {
            // Entire year
            const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
            const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
            query.$and = [
                {
                    $or: [
                        { year: year },
                        { date: { $gte: startOfYear, $lte: endOfYear } }
                    ]
                }
            ];
        } else {
            const month = parseInt(queryParams.month, 10);
            if (!isNaN(month)) {
                const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
                const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
                query.$and = [
                    {
                        $or: [
                            { year: year, month: month },
                            { date: { $gte: startOfMonth, $lte: endOfMonth } }
                        ]
                    }
                ];
            }
        }
    } else if (queryParams.year && queryParams.month !== 'lifetime') {
        const year = parseInt(queryParams.year, 10);
        const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        query.$and = [
            {
                $or: [
                    { year: year },
                    { date: { $gte: startOfYear, $lte: endOfYear } }
                ]
            }
        ];
    }

    // 2. Transaction Type Filter
    if (queryParams.type && queryParams.type !== 'all') {
        const t = queryParams.type.toLowerCase().trim();
        if (t === 'income' || t === 'expense') {
            query.type = t;
        }
    }

    // 3. Category Filter
    if (queryParams.category && queryParams.category !== 'all' && queryParams.category !== '') {
        query.category = new RegExp(`^${queryParams.category.trim()}$`, 'i');
    }

    // 4. Search Query Filter (matches text or category)
    if (queryParams.search && queryParams.search.trim()) {
        const searchRegex = new RegExp(queryParams.search.trim(), 'i');
        query.$or = [
            { text: searchRegex },
            { category: searchRegex }
        ];
    }

    // 5. Sorting
    let sort = { date: -1, _id: -1 };
    if (queryParams.sort === 'oldest') {
        sort = { date: 1, _id: 1 };
    } else if (queryParams.sort === 'highest') {
        sort = { amount: -1 };
    } else if (queryParams.sort === 'lowest') {
        sort = { amount: 1 };
    }

    return { query, sort };
}

module.exports = {
    generateCSV,
    generateExcel,
    generatePDF,
    getExportFileName,
    buildExportQuery,
    computeSummary,
    getPeriodDescription
};
