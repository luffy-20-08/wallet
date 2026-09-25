/**
 * ===================================================
 * WALLET PAYMENT PARSER & CATEGORY INTELLIGENCE
 * Extracts transaction details from PhonePe, GPay, Paytm,
 * UPI share text & Screenshot OCR output.
 * ===================================================
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PaymentParser = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // Controlled category mapping based STRICTLY on existing Wallet categories:
    // 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Investment', 'Salary', 'General'
    const CATEGORY_KEYWORDS = {
        'Food': [
            'food', 'dining', 'restaurant', 'swiggy', 'zomato', 'cafe', 'coffee',
            'starbucks', 'mcdonalds', 'burger', 'pizza', 'dominos', 'bakery', 'tea',
            'chai', 'eatclub', 'subway', 'lunch', 'dinner', 'breakfast', 'canteen',
            'hotel', 'sweets', 'snack', 'dhabha', 'kitchen', 'bistro', 'barbeque', 'bbq'
        ],
        'Transport': [
            'transport', 'transportation', 'uber', 'ola', 'rapido', 'petrol', 'fuel',
            'diesel', 'parking', 'metro', 'irctc', 'train', 'bus', 'flight', 'indigo',
            'toll', 'fastag', 'cab', 'auto', 'railway', 'redbus', 'airways', 'airline',
            'petrol bunk', 'gas station', 'hpcl', 'iocl', 'bpcl', 'shell'
        ],
        'Shopping': [
            'shopping', 'amazon', 'flipkart', 'myntra', 'ajio', 'dmart', 'supermarket',
            'mall', 'store', 'cloth', 'footwear', 'electronics', 'retail', 'market',
            'groceries', 'grocery', 'zepto', 'blinkit', 'instamart', 'bigbasket', 'bazaar',
            'mart', 'retail', 'provision', 'apparel', 'fashion', 'zara', 'h&m', 'meesho'
        ],
        'Bills': [
            'bill', 'bills', 'rent', 'electricity', 'bescom', 'water', 'gas', 'cylinder',
            'recharge', 'airtel', 'jio', 'vi', 'vodafone', 'broadband', 'wifi', 'dth',
            'tata play', 'maintenance', 'utility', 'utilities', 'pipe', 'cylinder',
            'indane', 'bharat gas', 'act fiber', 'tatasky', 'postpaid', 'prepaid'
        ],
        'Health': [
            'health', 'fitness', 'medical', 'medicine', 'pharmacy', 'hospital', 'clinic',
            'doctor', 'lab', '1mg', 'apollo', 'netmeds', 'gym', 'cult', 'pharma',
            'diagnostics', 'dental', 'chemist', 'care', 'pathology', 'medplus'
        ],
        'Entertainment': [
            'entertainment', 'movie', 'bookmyshow', 'pvr', 'inox', 'netflix', 'prime',
            'hotstar', 'spotify', 'youtube', 'gaming', 'steam', 'playstation', 'cinema',
            'theatre', 'amusement', 'disney', 'sonyliv', 'zee5', 'game'
        ],
        'Investment': [
            'investment', 'stocks', 'mutual fund', 'sip', 'zerodha', 'groww', 'angel',
            'crypto', 'coin', 'gold', 'fixed deposit', 'fd', 'rd', 'share', 'sebi',
            'bse', 'nse', 'upstox', 'kuvera', 'wealth'
        ],
        'Salary': [
            'salary', 'payroll', 'stipend', 'bonus', 'dividend', 'wage', 'earnings',
            'freelance', 'consulting fee', 'payout'
        ]
    };

    /**
     * Clean and normalize raw string
     */
    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            // Convert non-breaking and thin unicode spaces to normal space
            .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
            .trim();
    }

    /**
     * Parse payment amount
     * Handles ₹250, ₹250.00, Rs. 250, Rs 250, INR 250, Paid ₹250, Paid Rs.250,
     * Amount: ₹250, You paid ₹250, ₹1,250.50, Indian lakhs comma formatting,
     * multiline PhonePe screenshot layouts, and amounts next to payee names (e.g. RAJU DINKAR PATIL ₹20).
     */
    function extractAmount(rawInput) {
        if (!rawInput) return null;
        const text = cleanText(rawInput);
        if (!text) return null;

        const candidates = [];

        function parseNum(val) {
            if (!val) return null;
            const cleaned = String(val).replace(/,/g, '').trim();
            const num = parseFloat(cleaned);
            if (isNaN(num) || num <= 0) return null;
            if (num >= 10000000) return null;
            return num;
        }

        function isFalsePositive(num, rawContext = '') {
            // 12-digit UTR or 10-digit phone
            if (num >= 1000000000) return true;

            // Account last 4 digits (e.g. A/c 1234, XX1234, Ending in 1234)
            if (/(?:a\/c|account|ending|card|xx+)\s*[:#-]?\s*$/i.test(rawContext)) {
                return true;
            }

            // Year check (2020 - 2035) when accompanied by date markers
            if (num >= 2020 && num <= 2035) {
                if (/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[/-])/i.test(rawContext)) {
                    return true;
                }
            }

            // Day of month (1-31) when adjacent to month name (e.g. 24 Sep) and NOT preceded by currency
            if (num >= 1 && num <= 31 && !/(?:₹|Rs\.?|INR)/i.test(rawContext)) {
                if (/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(rawContext)) {
                    return true;
                }
            }

            return false;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // -------------------------------------------------------------
        // PASS 1: Line-by-Line Currency Symbol + Amount Match
        // -------------------------------------------------------------
        // Matches amounts in lines like:
        // - "RAJU DINKAR PATIL ₹20"
        // - "₹20"
        // - "Debited from: XXXX1234 \n ₹20"
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match any ₹/Rs/INR symbol followed by number anywhere in the line
            const symRegex = /(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
            let match;
            while ((match = symRegex.exec(line)) !== null) {
                const num = parseNum(match[1]);
                if (num !== null && !isFalsePositive(num, line)) {
                    let score = 90;
                    if (i <= 4) score += 10; // Top section near payee
                    if (/debited|paid|amount|total/i.test(line)) score += 10;
                    candidates.push({ amount: num, score, source: 'line_currency_symbol', raw: line });
                }
            }

            // Split ₹ on line i and number on line i+1
            if (/^(?:₹|Rs\.?|INR)$/i.test(line) && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const numMatch = nextLine.match(/^([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/);
                if (numMatch) {
                    const num = parseNum(numMatch[1]);
                    if (num !== null && !isFalsePositive(num, nextLine)) {
                        candidates.push({ amount: num, score: 95, source: 'split_rupee_line', raw: `${line} ${nextLine}` });
                    }
                }
            }

            // Amount right under "Debited from" or "Paid to"
            if (/^(?:debited\s+from|amount|total\s+paid)/i.test(line) && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const numMatch = nextLine.match(/^(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/i);
                if (numMatch) {
                    const num = parseNum(numMatch[1]);
                    if (num !== null && !isFalsePositive(num, nextLine)) {
                        candidates.push({ amount: num, score: 95, source: 'debited_from_next_line', raw: nextLine });
                    }
                }
            }

            // Standalone amount line right after payee line
            if (i > 0 && /^(?:paid\s+to|payment\s+to)$/i.test(lines[i - 2] || lines[i - 1])) {
                const standaloneNumMatch = line.match(/^([0-9]{1,6}(?:\.[0-9]{1,2})?)$/);
                if (standaloneNumMatch) {
                    const num = parseNum(standaloneNumMatch[1]);
                    if (num !== null && !isFalsePositive(num, line)) {
                        candidates.push({ amount: num, score: 85, source: 'ocr_paid_to_standalone_number', raw: line });
                    }
                }
            }

            // Standalone number line anywhere in receipt (e.g. "20", "30", "270")
            const bareNumMatch = line.match(/^([0-9]{1,6}(?:\.[0-9]{1,2})?)$/);
            if (bareNumMatch) {
                const num = parseNum(bareNumMatch[1]);
                if (num !== null && !isFalsePositive(num, line)) {
                    let score = 70;
                    // Boost if adjacent to another line that has OCR artifact '7' + same number (e.g. 730 and 30, or 720 and 20)
                    const has7Artifact = lines.some(l => l !== line && l === `7${bareNumMatch[1]}`);
                    if (has7Artifact) {
                        score = 96;
                    } else if (i >= lines.length - 4) {
                        score = 80; // Bottom receipt amount summary
                    }
                    candidates.push({ amount: num, score, source: 'standalone_number_line', raw: line });
                }
            }

            // ML Kit ₹ glyph misread as '7' prefix on a number line (e.g. "730", "720")
            const sevenPrefixMatch = line.match(/^7([0-9]{1,5}(?:\.[0-9]{1,2})?)$/);
            if (sevenPrefixMatch) {
                const numWithout7 = parseNum(sevenPrefixMatch[1]);
                if (numWithout7 !== null && !isFalsePositive(numWithout7, line)) {
                    // Only use if confirmed by another line or if no other candidates
                    const confirmedByBare = lines.some(l => l === sevenPrefixMatch[1]);
                    if (confirmedByBare) {
                        candidates.push({ amount: numWithout7, score: 95, source: 'mlkit_7_rupee_artifact', raw: line });
                    } else if (numWithout7 >= 10 && numWithout7 <= 100000) {
                        candidates.push({ amount: numWithout7, score: 65, source: 'mlkit_7_rupee_speculative', raw: line });
                    }
                }
            }
        }

        // -------------------------------------------------------------
        // PASS 2: Contextual Prefix Patterns in full text
        // -------------------------------------------------------------
        const prefixPatterns = [
            /(?:paid|you\s+paid|you've\s+paid|you\s+have\s+paid|payment\s+of|sent|debited|transferred|transfer\s+of)\s+(?:to\s+[^.\n\r,]+?\s+)?(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi,
            /(?:paid\s+to|sent\s+to|transfer\s+to)\s+[^.\n\r,]+?\s+(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi,
            /(?:amount|total\s+amount|total\s+paid|txn\s+amount)\s*[:=-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi,
            /(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|debited|transferred)/gi
        ];

        for (const pattern of prefixPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const num = parseNum(match[1]);
                if (num !== null && !isFalsePositive(num, match[0])) {
                    candidates.push({ amount: num, score: 100, source: 'prefix_match', raw: match[0] });
                }
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        return candidates[0].amount;
    }

    /**
     * Clean up and validate payee/merchant name
     * Strips leading avatar initials (e.g. "RP", "[RP]") and trailing amounts.
     */
    function cleanPayeeName(raw) {
        if (!raw) return '';
        let name = raw.trim();

        // Strip leading avatar initials if joined: e.g. "RP RAJU DINKAR PATIL" -> "RAJU DINKAR PATIL"
        name = name.replace(/^[\[(]?[A-Z]{1,3}[\])]?\s+/i, '');

        // Strip trailing amount if attached on same line: e.g. "RAJU DINKAR PATIL ₹20" -> "RAJU DINKAR PATIL"
        name = name.replace(/\s*(?:₹|Rs\.?|INR|[.*=-])?\s*[0-9]+(?:\.[0-9]{1,2})?\s*$/i, '');

        // Strip labels
        name = name.replace(/^(?:the|a|to|payee|recipient|banking\s+name|beneficiary\s+name)[:\s]+/i, '');

        name = name.trim();

        // Must be at least 2 characters and not just numbers or symbols
        if (name.length < 2) return '';
        if (/^[0-9,.\s₹]+$/.test(name)) return '';
        if (/^(?:₹|Rs|INR|\d+)/i.test(name)) return '';

        return name;
    }

    /**
     * Extract Payee / Merchant name
     * Avoids avatar initials (e.g. "RP", "PP") and supports "Banking Name: Raju Dinkar Patil".
     */
    function extractMerchant(text) {
        if (!text) return '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // 1. Highest Priority: "Banking Name: <Name>" or "Beneficiary Name: <Name>"
        const bankingNameMatch = text.match(/(?:banking\s+name|beneficiary\s+name|payee\s+name)[:\s]+([^\n\r,]+)/i);
        if (bankingNameMatch && bankingNameMatch[1]) {
            const name = cleanPayeeName(bankingNameMatch[1]);
            if (name) return name;
        }

        // 2. Multiline Paid To Section
        for (let i = 0; i < lines.length; i++) {
            if (/^(?:paid\s+to|payment\s+to|sent\s+to)$/i.test(lines[i])) {
                // Check subsequent lines (skip avatar initials, status, date/time, upi ids)
                for (let j = i + 1; j <= Math.min(i + 6, lines.length - 1); j++) {
                    const line = lines[j];

                    // Skip avatar initials: 1-3 uppercase letters
                    if (/^[\[(]?[A-Z]{1,3}[\])]?$/.test(line)) {
                        continue;
                    }

                    // Skip status messages or section headers
                    if (/^(?:transaction\s+successful|payment\s+successful|paid\s+successfully|completed|successful|transfer\s+details|transaction\s+details|payment\s+details|split\s+bill)$/i.test(line)) {
                        continue;
                    }

                    // Skip date/time lines (e.g. "06:32 pm on 23 Sept 2026")
                    if (/\b(?:am|pm|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i.test(line)) {
                        continue;
                    }

                    // Skip UPI ID / email lines
                    if (/@/.test(line)) {
                        continue;
                    }

                    // Skip lines that are purely currency/numbers
                    if (/^(?:₹|Rs\.?|INR|\d|[.*=-])+/i.test(line)) {
                        continue;
                    }

                    // Skip common footer labels
                    if (/^(?:debited\s+from|credited\s+to|powered\s+by|upd|upi|view\s+details|share\s+receipt)/i.test(line)) {
                        continue;
                    }

                    const cleaned = cleanPayeeName(line);
                    if (cleaned) {
                        return cleaned;
                    }
                }
            }
        }

        // 3. Inline Paid to Pattern: "Paid ₹250 to XYZ Store" or "Paid to XYZ Store"
        const inlineMatch = text.match(/(?:paid|sent|payment\s+of)\s+(?:to\s+)?(?:₹|Rs\.?|INR)?\s*[0-9,.]*\s*(?:to\s+)?([^.\n\r,]+?)(?:\s+(?:via|using|on|successful|completed|for|ref|upi|utr|from|\()|\.|\n|$)/i);
        if (inlineMatch && inlineMatch[1]) {
            const cleaned = cleanPayeeName(inlineMatch[1]);
            if (cleaned) return cleaned;
        }

        // 4. "Received from <Sender>"
        const recMatch = text.match(/(?:received from|transfer from)\s+([^.\n\r,]+?)(?:\s+(?:via|using|on|ref|upi|utr|\()|\.|\n|$)/i);
        if (recMatch && recMatch[1]) {
            const name = cleanPayeeName(recMatch[1]);
            if (name) return name;
        }

        return '';
    }

    /**
     * Extract UPI reference / UTR / Transaction ID
     * Prioritizes 12-digit UTR (e.g. 598570755261) over internal Transaction IDs (e.g. T260924...).
     */
    function extractReferenceId(text) {
        if (!text) return '';

        // 1. Highest Priority: Explicit 12-digit UTR
        // e.g. "UTR: 598570755261", "UTR No. 598570755261"
        const utrRegex = /(?:UTR(?:\s*No\.?|\s*Number)?|UPI\s*Ref(?:erence)?(?:\s*No\.?)?)[:\s#]*([0-9]{12})\b/i;
        const utrMatch = text.match(utrRegex);
        if (utrMatch && utrMatch[1]) {
            return utrMatch[1].trim();
        }

        // 2. Any standalone 12-digit UTR number in Indian UPI range
        const standalone12 = text.match(/\b([1-9]\d{11})\b/);
        if (standalone12 && standalone12[1]) {
            return standalone12[1].trim();
        }

        // 3. Any explicit UTR with alphanumeric code
        const utrAlpha = text.match(/\bUTR[:\s#]*([a-zA-Z0-9]{8,22})\b/i);
        if (utrAlpha && utrAlpha[1]) {
            return utrAlpha[1].trim();
        }

        // 4. Fallback: PhonePe Transaction ID or UPI Transaction ID
        const txnRegex = /(?:PhonePe\s*Transaction\s*ID|Transaction\s*ID|Txn\s*ID)[:\s#]*([a-zA-Z0-9]{12,28})/i;
        const txnMatch = text.match(txnRegex);
        if (txnMatch && txnMatch[1]) {
            return txnMatch[1].trim();
        }

        return '';
    }

    /**
     * Extract Date and Time
     */
    function extractDateTime(text) {
        const now = new Date();
        let dateStr = '';
        let timeStr = '';

        if (!text) {
            return {
                date: formatDateISO(now),
                time: formatTimeStr(now)
            };
        }

        // Match formats like "24 Sep 2026", "24 September 2026", "24-09-2026", "24/09/2026"
        const monthNamesMatch = text.match(/(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
        if (monthNamesMatch) {
            const day = parseInt(monthNamesMatch[1], 10);
            const monthStr = monthNamesMatch[2].substring(0, 3).toLowerCase();
            const year = parseInt(monthNamesMatch[3], 10);
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIdx = months.indexOf(monthStr);
            if (monthIdx !== -1) {
                const d = new Date(year, monthIdx, day);
                dateStr = formatDateISO(d);
            }
        }

        if (!dateStr) {
            const numericDateMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
            if (numericDateMatch) {
                let d = parseInt(numericDateMatch[1], 10);
                let m = parseInt(numericDateMatch[2], 10);
                let y = parseInt(numericDateMatch[3], 10);
                if (y < 100) y += 2000;
                // Treat as DD/MM/YYYY
                const dateObj = new Date(y, m - 1, d);
                if (!isNaN(dateObj.getTime())) {
                    dateStr = formatDateISO(dateObj);
                }
            }
        }

        // Match time format: "10:30 AM", "08:15:30 PM", "14:20"
        const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/);
        if (timeMatch) {
            timeStr = timeMatch[1].trim();
        }

        return {
            date: dateStr || formatDateISO(now),
            time: timeStr || formatTimeStr(now)
        };
    }

    /**
     * Extract optional Note or Remark
     */
    function extractNote(text) {
        if (!text) return '';
        const match = text.match(/(?:Note|Remark|Remarks|Message|For):\s*([^\n\r.]+)/i);
        if (match && match[1]) {
            return match[1].trim();
        }
        return '';
    }

    /**
     * Determine transaction type: 'expense' or 'income'
     */
    function extractType(text) {
        if (!text) return 'expense';
        const lower = text.toLowerCase();
        if (
            lower.includes('received from') ||
            lower.includes('credited to') ||
            lower.includes('cashback') ||
            lower.includes('refund received')
        ) {
            return 'income';
        }
        return 'expense';
    }

    /**
     * Detect payment app / method
     */
    function extractPaymentMethod(text) {
        if (!text) return 'UPI';
        const lower = text.toLowerCase();
        if (lower.includes('phonepe')) return 'PhonePe UPI';
        if (lower.includes('gpay') || lower.includes('google pay')) return 'Google Pay';
        if (lower.includes('paytm')) return 'Paytm UPI';
        if (lower.includes('cred')) return 'CRED UPI';
        if (lower.includes('bhim')) return 'BHIM UPI';
        if (lower.includes('card')) return 'Debit/Credit Card';
        if (lower.includes('net banking') || lower.includes('netbanking')) return 'Net Banking';
        return 'UPI';
    }

    /**
     * Category Detection Heuristic
     * Requirement 8 & 9:
     * - Uses existing Wallet categories
     * - Returns confident category if matched
     * - If uncertain, returns empty category with needsCategorySelection: true
     */
    function detectCategory(merchant, note, fullText) {
        const combined = `${merchant || ''} ${note || ''} ${fullText || ''}`.toLowerCase();

        for (const [categoryKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const kw of keywords) {
                // Word boundary match or exact substring
                const pattern = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
                if (pattern.test(combined)) {
                    return {
                        category: categoryKey,
                        confidence: 'high',
                        matchedKeyword: kw,
                        needsCategorySelection: false
                    };
                }
            }
        }

        // If no confident category could be detected, do NOT guess silently!
        return {
            category: '',
            confidence: 'none',
            matchedKeyword: null,
            needsCategorySelection: true
        };
    }

    /**
     * Master Parsing Pipeline
     * Takes raw text (either shared text or OCR extracted text)
     * and produces structured payment object
     */
    function parsePaymentText(rawInput) {
        const text = cleanText(rawInput);
        if (!text) {
            return {
                rawText: '',
                amount: null,
                merchant: '',
                date: formatDateISO(new Date()),
                time: formatTimeStr(new Date()),
                referenceId: '',
                note: '',
                type: 'expense',
                paymentMethod: 'UPI',
                category: '',
                needsCategorySelection: true,
                confidence: 'none'
            };
        }

        const amount = extractAmount(text);
        const merchant = extractMerchant(text);
        const refId = extractReferenceId(text);
        const { date, time } = extractDateTime(text);
        const note = extractNote(text);
        const type = extractType(text);
        const paymentMethod = extractPaymentMethod(text);

        // Detect category using merchant, note, and full text
        const catResult = detectCategory(merchant, note, text);

        return {
            rawText: text,
            amount: amount,
            merchant: merchant || (type === 'income' ? 'Received Payment' : 'Payment'),
            date: date,
            time: time,
            referenceId: refId,
            note: note,
            type: type,
            paymentMethod: paymentMethod,
            category: catResult.category,
            needsCategorySelection: catResult.needsCategorySelection,
            confidence: catResult.confidence,
            matchedKeyword: catResult.matchedKeyword
        };
    }

    // Helper utilities
    function formatDateISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function formatTimeStr(d) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    return {
        cleanText,
        extractAmount,
        extractMerchant,
        extractReferenceId,
        extractDateTime,
        extractNote,
        extractType,
        extractPaymentMethod,
        detectCategory,
        parsePaymentText,
        CATEGORY_KEYWORDS
    };
}));
