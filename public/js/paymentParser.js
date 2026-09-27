/**
 * ============================================================================
 * WALLET ADVANCED PAYMENT & OCR INTELLIGENCE ENGINE (v3.0.0)
 * ============================================================================
 * Production-grade payment screenshot & share-text parser for Android & Web.
 * 
 * Capabilities:
 * - Multi-pass OCR candidate extraction & spatial bounding-box weighting
 * - Robust amount extraction with strict rejection of UTRs, dates, phone numbers
 * - Dedicated calendar-valid transaction date extractor (NEVER defaults to today)
 * - Safe OCR glyph normalization (₹ -> 7, O -> 0, I -> 1, commas/spaces in thousands)
 * - Provider classification (PhonePe, GPay, Paytm, BHIM, Amazon Pay, Generic UPI)
 * - Multiline merchant name reconstruction and system label filtering
 * - Defensible confidence scoring (HIGH, MEDIUM, NEEDS_CONFIRMATION)
 * - Developer-only diagnostic trace (NO secrets, passwords, or PII exposed)
 * ============================================================================
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PaymentParser = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // Category mapping strictly matching Wallet categories
    const CATEGORY_KEYWORDS = {
        'Food': [
            'swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald',
            'burger', 'pizza', 'dominos', 'bakery', 'tea', 'chai', 'eatclub', 'subway',
            'lunch', 'dinner', 'breakfast', 'canteen', 'hotel', 'sweets', 'snack', 'dhabha',
            'kitchen', 'bistro', 'barbeque', 'bbq', 'food', 'dining', 'kfc', 'haldiram'
        ],
        'Transport': [
            'uber', 'ola', 'rapido', 'petrol', 'fuel', 'diesel', 'parking', 'metro',
            'irctc', 'train', 'bus', 'flight', 'indigo', 'toll', 'fastag', 'cab', 'auto',
            'railway', 'redbus', 'airways', 'airline', 'petrol bunk', 'gas station', 'hpcl',
            'iocl', 'bpcl', 'shell', 'transport', 'transportation'
        ],
        'Shopping': [
            'amazon', 'flipkart', 'myntra', 'ajio', 'dmart', 'supermarket', 'mall', 'store',
            'cloth', 'footwear', 'electronics', 'retail', 'market', 'groceries', 'grocery',
            'zepto', 'blinkit', 'instamart', 'bigbasket', 'bazaar', 'mart', 'retail',
            'provision', 'apparel', 'fashion', 'zara', 'h&m', 'meesho', 'shopping', 'reliance'
        ],
        'Bills': [
            'bill', 'bills', 'rent', 'electricity', 'bescom', 'water', 'gas', 'cylinder',
            'recharge', 'airtel', 'jio', 'vi', 'vodafone', 'broadband', 'wifi', 'dth',
            'tata play', 'maintenance', 'utility', 'utilities', 'pipe', 'cylinder', 'indane',
            'bharat gas', 'act fiber', 'tatasky', 'postpaid', 'prepaid', 'electricity bill'
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

    const MONTH_MAP = {
        'jan': 0, 'january': 0,
        'feb': 1, 'february': 1,
        'mar': 2, 'march': 2,
        'apr': 3, 'april': 3,
        'may': 4,
        'jun': 5, 'june': 5,
        'jul': 6, 'july': 6,
        'aug': 7, 'august': 7,
        'sep': 8, 'sept': 8, 'september': 8,
        'oct': 9, 'october': 9,
        'nov': 10, 'november': 10,
        'dec': 11, 'december': 11
    };

    /**
     * Clean and normalize raw text
     */
    function cleanText(text) {
        if (!text) return '';
        return String(text)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
            .trim();
    }

    /**
     * Safe numeric parsing supporting Indian formatting (e.g. 1,509 or 13,784.00)
     */
    function parseNumericAmount(str) {
        if (!str) return null;
        let s = String(str).trim();
        // Remove spaces inside numbers e.g. "13 784"
        s = s.replace(/\s+/g, '');
        // Remove thousands commas e.g. "13,784.00" -> "13784.00"
        s = s.replace(/,/g, '');
        // Normalize OCR glyph errors: O/o -> 0, S -> 5
        s = s.replace(/[oO]/g, '0');
        
        const num = parseFloat(s);
        if (isNaN(num) || num <= 0 || !isFinite(num)) return null;
        if (num >= 10000000) return null; // Exclude >= 1 Crore (likely UTR or phone)
        return Math.round(num * 100) / 100;
    }

    /**
     * Provider classifier based on text tokens and layout cues
     */
    function detectProvider(text) {
        const lower = (text || '').toLowerCase();
        if (lower.includes('phonepe') || lower.includes('phon.pe') || lower.includes('upd yes bank')) {
            return 'PhonePe';
        }
        if (lower.includes('google pay') || lower.includes('gpay') || lower.includes('@okaxis') || lower.includes('@okhdfcbank') || lower.includes('@okicici') || lower.includes('@okbizaxis')) {
            return 'Google Pay';
        }
        if (lower.includes('paytm') || lower.includes('@ptys') || lower.includes('paytm payments')) {
            return 'Paytm';
        }
        if (lower.includes('amazon pay') || lower.includes('@apl')) {
            return 'Amazon Pay';
        }
        if (lower.includes('bhim') || lower.includes('upi')) {
            return 'BHIM UPI';
        }
        return 'UPI';
    }

    // ========================================================================
    // AMOUNT DETECTION & SCORING ENGINE
    // ========================================================================

    /**
     * Determine whether a numeric candidate is an obvious false positive
     */
    function isAmountFalsePositive(num, rawContext, fullText) {
        // 1. Long strings: 12-digit UTR or 10-digit phone
        if (num >= 1000000000) return true;

        // 2. 10-digit phone number check
        if (String(Math.floor(num)).length === 10 && /^[6-9]/.test(String(Math.floor(num)))) {
            return true;
        }

        // 3. Bank Account / Card suffix
        if (/(?:a\/c|account|ending|card|xx+|\*{2,})\s*[:#-]?\s*$/i.test(rawContext || '')) {
            return true;
        }

        // 4. Date check: Year number 2020-2035 when adjacent to date words
        if (num >= 2020 && num <= 2035) {
            if (/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[/-])/i.test(rawContext || '')) {
                return true;
            }
        }

        // 5. Day of month (1-31) when adjacent to month name and NOT preceded by currency symbol
        if (num >= 1 && num <= 31 && !/(?:[₹]|Rs\.?|INR)/i.test(rawContext || '')) {
            if (/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(rawContext || '')) {
                return true;
            }
        }

        // 6. Time string like "10.35" or "16.32" when adjacent to AM/PM or "Time"
        if (/(?:am|pm|time|hours|hrs)/i.test(rawContext || '')) {
            if (/^\d{1,2}[.:]\d{2}\s*(?:am|pm)?$/i.test(String(rawContext).trim())) {
                return true;
            }
        }

        // 7. Check if part of a UTR line: "UTR: 598570755261"
        if (/utr|rrn|txn|ref/i.test(rawContext || '')) {
            if (String(Math.floor(num)).length >= 8) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract and score all amount candidates
     */
    function extractAmountCandidates(text, linesData) {
        const candidates = [];
        const lines = cleanText(text).split('\n').map(l => l.trim()).filter(Boolean);

        function addCandidate(val, baseScore, reason, sourceLine, relY, boxHeight) {
            const num = parseNumericAmount(val);
            if (num === null || isAmountFalsePositive(num, sourceLine, text)) return;

            let score = baseScore;

            // Spatial bonus if spatial line data available
            if (typeof relY === 'number') {
                if (relY >= 0.12 && relY <= 0.52) {
                    score += 20; // Prominent upper-middle area
                } else if (relY > 0.85) {
                    score -= 30; // Near footer/system controls
                }
            }

            // Box height / font size bonus
            if (typeof boxHeight === 'number' && boxHeight > 40) {
                score += 15;
            }

            // Keyword boost
            if (/(?:paid|debited|amount|total|you paid|payment of)/i.test(sourceLine || '')) {
                score += 15;
            }

            // Standard decimal (.00, .50) boost
            if (/\.\d{2}$/.test(String(val))) {
                score += 10;
            }

            // Currency symbol adjacent boost
            if (/(?:[₹]|Rs\.?|INR)/i.test(sourceLine || '')) {
                score += 25;
            }

            candidates.push({
                amount: num,
                score: Math.min(score, 100),
                reason,
                raw: sourceLine || String(val)
            });
        }

        // -------------------------------------------------------------
        // PASS A: Regex with Currency Symbol in Single Line
        // Matches: "₹20", "₹ 20.00", "Rs. 500", "INR 1,509", "RAJU DINKAR PATIL ₹20"
        // -------------------------------------------------------------
        const curRegex = /(?:[₹]|Rs\.?|INR)\s*[:=-]?\s*([0-9oOsS]{1,3}(?:[,\s][0-9oOsS]{2,3})*(?:\.[0-9oOsS]{1,2})?|[0-9oOsS]+(?:\.[0-9oOsS]{1,2})?)/gi;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            while ((match = curRegex.exec(line)) !== null) {
                const normVal = match[1].replace(/[oO]/g, '0').replace(/[sS]/g, '5');
                const relY = linesData && linesData[i] ? linesData[i].relTop : (i / Math.max(lines.length, 1));
                const bHeight = linesData && linesData[i] ? linesData[i].height : undefined;
                addCandidate(normVal, 80, 'Explicit currency symbol in line', line, relY, bHeight);
            }

            // Split line: Currency symbol on line i, number on line i+1
            if (/^(?:[₹]|Rs\.?|INR)$/i.test(line) && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const nextMatch = nextLine.match(/^([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/);
                if (nextMatch) {
                    const relY = linesData && linesData[i] ? linesData[i].relTop : (i / Math.max(lines.length, 1));
                    addCandidate(nextMatch[1], 85, 'Currency symbol followed by amount on next line', `${line} ${nextLine}`, relY);
                }
            }

            // Under "Debited from", "Paid to", "Amount"
            if (/^(?:debited\s+from|amount|total\s+paid|you\s+paid)/i.test(line) && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const nextMatch = nextLine.match(/^(?:[₹]|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/i);
                if (nextMatch) {
                    addCandidate(nextMatch[1], 80, 'Amount line under transaction header', nextLine, (i + 1) / lines.length);
                }
            }

            // ML Kit ₹ glyph misread as '7' prefix (e.g. "730" for ₹30, "720" for ₹20)
            const sevenMatch = line.match(/^7([0-9]{1,5}(?:\.[0-9]{1,2})?)$/);
            if (sevenMatch) {
                const un7Val = sevenMatch[1];
                // Check if the bare number also appears elsewhere in receipt
                const confirmedByBare = lines.some(l => l === un7Val || l.includes(`₹${un7Val}`) || l.includes(`₹ ${un7Val}`));
                if (confirmedByBare) {
                    addCandidate(un7Val, 85, 'OCR 7-glyph artifact corrected by confirmation', line, i / lines.length);
                } else {
                    addCandidate(un7Val, 55, 'OCR 7-glyph artifact speculative candidate', line, i / lines.length);
                }
            }

            // Standalone bare number line e.g. "20", "30", "1509", "13784.00"
            const bareMatch = line.match(/^([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/);
            if (bareMatch) {
                const num = parseNumericAmount(bareMatch[1]);
                if (num !== null && !isAmountFalsePositive(num, line, text)) {
                    // Check if adjacent to 7-glyph artifact
                    const has7Artifact = lines.some(l => l === `7${bareMatch[1]}`);
                    const score = has7Artifact ? 88 : (i <= 5 ? 65 : 50);
                    addCandidate(bareMatch[1], score, 'Standalone numeric line', line, i / lines.length);
                }
            }
        }

        // -------------------------------------------------------------
        // PASS B: Contextual Prefix Regex (Strictly Single-Line)
        // Matches "Paid ₹250 to ABC", "You paid ₹1,250", "Payment of INR 500"
        // -------------------------------------------------------------
        const prefixPatterns = [
            /(?:paid|you\s+paid|you've\s+paid|you\s+have\s+paid|payment\s+of|sent|debited|transferred|transfer\s+of)[^\n\r]*?(?:[₹]|Rs\.?|INR)\s*[:=-]?\s*([0-9oO]{1,3}(?:[, ][0-9oO]{2,3})*(?:\.[0-9oO]{1,2})?|[0-9oO]+(?:\.[0-9oO]{1,2})?)/gi,
            /(?:amount|total\s+amount|total\s+paid|txn\s+amount)\s*[:=-]?[^\n\r]*?(?:[₹]|Rs\.?|INR)?\s*([0-9oO]{1,3}(?:[, ][0-9oO]{2,3})*(?:\.[0-9oO]{1,2})?|[0-9oO]+(?:\.[0-9oO]{1,2})?)/gi,
            /(?:[₹]|Rs\.?|INR)\s*([0-9oO]{1,3}(?:[, ][0-9oO]{2,3})*(?:\.[0-9oO]{1,2})?|[0-9oO]+(?:\.[0-9oO]{1,2})?)[^\n\r]*?(?:paid|sent|debited|transferred)/gi
        ];

        for (const pattern of prefixPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const normVal = match[1].replace(/[oO]/g, '0');
                addCandidate(normVal, 95, 'High-confidence prefix contextual match', match[0]);
            }
        }

        // Deduplicate & group candidates by amount
        const amountMap = new Map();
        for (const cand of candidates) {
            const key = cand.amount;
            if (!amountMap.has(key)) {
                amountMap.set(key, { ...cand, passCount: 1, rawVariants: [cand.raw] });
            } else {
                const existing = amountMap.get(key);
                existing.score = Math.min(100, Math.max(existing.score, cand.score) + 10);
                existing.passCount += 1;
                if (!existing.rawVariants.includes(cand.raw)) {
                    existing.rawVariants.push(cand.raw);
                }
            }
        }

        let sorted = Array.from(amountMap.values()).sort((a, b) => b.score - a.score);

        // Prune truncated partial matches (e.g. 5 vs 500, or 13 vs 13784)
        sorted = sorted.filter((candA) => {
            const isTruncated = sorted.some((candB) => {
                if (candA.amount >= candB.amount) return false;
                const strA = String(Math.floor(candA.amount));
                const strB = String(Math.floor(candB.amount));
                if (strB.startsWith(strA) && candB.rawVariants.some(v => candA.rawVariants.some(av => v.includes(av) || av.includes(v)))) {
                    return true;
                }
                return false;
            });
            return !isTruncated;
        });

        return sorted;
    }

    /**
     * Resolve final amount with validation & confidence classification
     */
    function resolveAmount(candidates) {
        if (!candidates || candidates.length === 0) {
            return {
                value: null,
                confidence: 'NEEDS_CONFIRMATION',
                score: 0,
                requiresConfirmation: true,
                reason: 'No amount candidates detected in screenshot'
            };
        }

        const top = candidates[0];

        // Check if top candidate is in conflict with runner-up
        if (candidates.length > 1) {
            const runnerUp = candidates[1];
            // If top candidate has explicit currency indicator and runner up does not, top is clear winner
            const topHasCurrency = top.rawVariants && top.rawVariants.some(v => /(?:[₹]|Rs\.?|INR)/i.test(v));
            const runnerHasCurrency = runnerUp.rawVariants && runnerUp.rawVariants.some(v => /(?:[₹]|Rs\.?|INR)/i.test(v));

            if (topHasCurrency && !runnerHasCurrency && top.score >= 80) {
                return {
                    value: top.amount,
                    confidence: 'HIGH',
                    score: top.score,
                    requiresConfirmation: false,
                    reason: top.reason,
                    candidates
                };
            }

            // Both have currency and close scores
            if (runnerUp.score >= 75 && (top.score - runnerUp.score) < 15 && top.amount !== runnerUp.amount) {
                return {
                    value: top.amount,
                    confidence: 'NEEDS_CONFIRMATION',
                    score: top.score,
                    requiresConfirmation: true,
                    reason: `Conflicting amount candidates detected (₹${top.amount} vs ₹${runnerUp.amount}). Please confirm.`,
                    candidates
                };
            }
        }

        if (top.score >= 80) {
            return {
                value: top.amount,
                confidence: 'HIGH',
                score: top.score,
                requiresConfirmation: false,
                reason: top.reason,
                candidates
            };
        } else if (top.score >= 60) {
            return {
                value: top.amount,
                confidence: 'MEDIUM',
                score: top.score,
                requiresConfirmation: false,
                reason: top.reason,
                candidates
            };
        } else {
            return {
                value: top.amount,
                confidence: 'NEEDS_CONFIRMATION',
                score: top.score,
                requiresConfirmation: true,
                reason: 'Low confidence amount detection. Please confirm.',
                candidates
            };
        }
    }

    // ========================================================================
    // DEDICATED TRANSACTION DATE & TIME EXTRACTION ENGINE
    // ========================================================================

    /**
     * Formats Date to YYYY-MM-DD
     */
    function formatDateISO(d) {
        if (!d || isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Validate calendar date strictly (e.g. reject 31/02/2026)
     */
    function isValidCalendarDate(year, monthIdx, day) {
        if (year < 2020 || year > 2035) return false;
        if (monthIdx < 0 || monthIdx > 11) return false;
        if (day < 1 || day > 31) return false;
        
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        if (day > daysInMonth) return false;

        return true;
    }

    /**
     * Extract and score all date candidates from text
     * NEVER defaults to today's date!
     */
    function extractDateCandidates(text, linesData) {
        const candidates = [];
        const clean = cleanText(text);
        const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

        function addDateCand(dObj, baseScore, reason, rawSnippet, lineIdx) {
            if (!dObj || isNaN(dObj.getTime())) return;
            const iso = formatDateISO(dObj);
            if (!iso) return;

            let score = baseScore;

            // Proximity to date keywords in snippet or line
            if (/(?:date|transaction\s+date|paid\s+on|sent\s+on|received\s+on|successful\s+on|completed\s+on|\bon\b)/i.test(rawSnippet || '')) {
                score += 25;
            }

            // Deduct if explicitly a statement or bill generated date
            if (/(?:statement\s+generated|bill\s+due|valid\s+till|generated\s+on)/i.test(rawSnippet || '')) {
                score -= 30;
            }

            // Spatial bonus: middle/details region
            if (typeof lineIdx === 'number' && lines.length > 0) {
                const relY = lineIdx / lines.length;
                if (relY >= 0.25 && relY <= 0.85) {
                    score += 15;
                }
            }

            candidates.push({
                isoDate: iso,
                dateObj: dObj,
                score: Math.min(score, 100),
                reason,
                raw: rawSnippet
            });
        }

        // -------------------------------------------------------------
        // PATTERN 1: DD MMM YYYY / DD Month YYYY
        // Examples: "25 Sep 2026", "23 Sept 2026", "25 September 2026", "06:32 pm on 23 Sept 2026"
        // -------------------------------------------------------------
        const ddMmmYyyyRegex = /\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{2,4})\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            while ((match = ddMmmYyyyRegex.exec(line)) !== null) {
                const day = parseInt(match[1], 10);
                const monthStr = match[2].toLowerCase();
                let year = parseInt(match[3].replace(/[oO]/g, '0'), 10);
                if (year < 100) year += 2000;

                const monthIdx = MONTH_MAP[monthStr] !== undefined ? MONTH_MAP[monthStr] : MONTH_MAP[monthStr.substring(0, 3)];
                if (monthIdx !== undefined && isValidCalendarDate(year, monthIdx, day)) {
                    const d = new Date(year, monthIdx, day);
                    addDateCand(d, 85, 'Named month date format (DD MMM YYYY)', match[0], i);
                }
            }
        }

        // -------------------------------------------------------------
        // PATTERN 2: MMM DD, YYYY / Month DD, YYYY
        // Examples: "Sep 25, 2026", "September 25, 2026"
        // -------------------------------------------------------------
        const mmmDdYyyyRegex = /\b([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            while ((match = mmmDdYyyyRegex.exec(line)) !== null) {
                const monthStr = match[1].toLowerCase();
                const day = parseInt(match[2], 10);
                let year = parseInt(match[3].replace(/[oO]/g, '0'), 10);
                if (year < 100) year += 2000;

                const monthIdx = MONTH_MAP[monthStr] !== undefined ? MONTH_MAP[monthStr] : MONTH_MAP[monthStr.substring(0, 3)];
                if (monthIdx !== undefined && isValidCalendarDate(year, monthIdx, day)) {
                    const d = new Date(year, monthIdx, day);
                    addDateCand(d, 85, 'Named month date format (MMM DD, YYYY)', match[0], i);
                }
            }
        }

        // -------------------------------------------------------------
        // PATTERN 3: Numeric Dates DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
        // Normalizes OCR variants: 25/09/2O26, 25/O9/2026
        // -------------------------------------------------------------
        const numDateRegex = /\b(\d{1,2})[/\-.]([0-9oO]{1,2})[/\-.]([0-9oO]{2,4})\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            while ((match = numDateRegex.exec(line)) !== null) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2].replace(/[oO]/g, '0'), 10);
                let year = parseInt(match[3].replace(/[oO]/g, '0'), 10);
                if (year < 100) year += 2000;

                if (isValidCalendarDate(year, month - 1, day)) {
                    const d = new Date(year, month - 1, day);
                    addDateCand(d, 80, 'Numeric date format (DD/MM/YYYY)', match[0], i);
                }
            }
        }

        // -------------------------------------------------------------
        // PATTERN 4: ISO Format YYYY-MM-DD
        // -------------------------------------------------------------
        const isoRegex = /\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            while ((match = isoRegex.exec(line)) !== null) {
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10);
                const day = parseInt(match[3], 10);

                if (isValidCalendarDate(year, month - 1, day)) {
                    const d = new Date(year, month - 1, day);
                    addDateCand(d, 80, 'ISO date format (YYYY-MM-DD)', match[0], i);
                }
            }
        }

        // Group & deduplicate by ISO date
        const dateMap = new Map();
        for (const cand of candidates) {
            const key = cand.isoDate;
            if (!dateMap.has(key)) {
                dateMap.set(key, { ...cand, count: 1 });
            } else {
                const existing = dateMap.get(key);
                existing.score = Math.min(100, Math.max(existing.score, cand.score) + 10);
                existing.count += 1;
            }
        }

        return Array.from(dateMap.values()).sort((a, b) => b.score - a.score);
    }

    /**
     * Resolve final date strictly without defaulting to current date
     */
    function resolveDate(candidates) {
        if (!candidates || candidates.length === 0) {
            return {
                value: null,
                confidence: 'NEEDS_CONFIRMATION',
                score: 0,
                requiresConfirmation: true,
                reason: 'No transaction date detected in screenshot. Manual confirmation required.'
            };
        }

        const top = candidates[0];
        if (top.score >= 75) {
            return {
                value: top.isoDate,
                confidence: 'HIGH',
                score: top.score,
                requiresConfirmation: false,
                reason: top.reason,
                candidates
            };
        } else if (top.score >= 50) {
            return {
                value: top.isoDate,
                confidence: 'MEDIUM',
                score: top.score,
                requiresConfirmation: false,
                reason: top.reason,
                candidates
            };
        } else {
            return {
                value: top.isoDate,
                confidence: 'NEEDS_CONFIRMATION',
                score: top.score,
                requiresConfirmation: true,
                reason: 'Uncertain date candidate. Please confirm.',
                candidates
            };
        }
    }

    /**
     * Dedicated Time Extractor
     * Supports: 10:35 AM, 10:35 PM, 06:32 pm, 22:35, 10.35 PM
     */
    function extractTime(text) {
        if (!text) return { value: '', confidence: 'NEEDS_CONFIRMATION' };
        
        // 12-hour format e.g. "06:32 pm", "10:35 AM", "10.35 PM"
        const time12Match = text.match(/\b([01]?\d)[.:](\d{2})(?::\d{2})?\s*(am|pm)\b/i);
        if (time12Match) {
            let hour = parseInt(time12Match[1], 10);
            const min = time12Match[2];
            const ampm = time12Match[3].toUpperCase();
            if (hour >= 1 && hour <= 12) {
                return {
                    value: `${String(hour).padStart(2, '0')}:${min} ${ampm}`,
                    confidence: 'HIGH'
                };
            }
        }

        // 24-hour format e.g. "22:35", "16:32"
        const time24Match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
        if (time24Match) {
            const h = parseInt(time24Match[1], 10);
            const m = time24Match[2];
            return {
                value: `${String(h).padStart(2, '0')}:${m}`,
                confidence: 'MEDIUM'
            };
        }

        return { value: '', confidence: 'NEEDS_CONFIRMATION' };
    }

    // ========================================================================
    // MERCHANT / PAYEE EXTRACTION ENGINE
    // ========================================================================

    /**
     * Clean and format payee name
     */
    function cleanPayeeName(raw) {
        if (!raw) return '';
        let name = String(raw).trim();

        // Strip leading avatar initials: "RP RAJU DINKAR PATIL" -> "RAJU DINKAR PATIL"
        name = name.replace(/^[\[(]?[A-Z]{1,3}[\])]?\s+/i, '');

        // Strip trailing amounts on same line: "RAJU DINKAR PATIL ₹20" -> "RAJU DINKAR PATIL"
        name = name.replace(/\s*(?:[₹]|Rs\.?|INR|[.*=-])?\s*[0-9]+(?:\.[0-9]{1,2})?\s*$/i, '');

        // Strip common prefix labels
        name = name.replace(/^(?:the|to|payee|recipient|banking\s+name|beneficiary\s+name|paid\s+to|payment\s+to|sent\s+to)[:\s]+/i, '');

        name = name.trim();

        if (name.length < 2) return '';
        if (/^[0-9,.\s₹]+$/.test(name)) return '';
        if (/^(?:[₹]|Rs|INR|\d+)/i.test(name)) return '';

        return name;
    }

    /**
     * Check if a candidate line is an invalid system label
     */
    function isSystemStatusLabel(line) {
        const lower = line.toLowerCase().trim();
        const badPhrases = [
            'transaction successful', 'payment successful', 'paid successfully',
            'transfer successful', 'payment completed', 'completed', 'successful',
            'transfer details', 'transaction details', 'payment details',
            'split bill', 'split this expense', 'share receipt', 'view details',
            'check balance', 'powered by upi', 'powered by', 'upd yes bank',
            'upi transaction id', 'phonepe transaction id', 'debited from',
            'credited to', 'sent to', 'paid using', 'explore the app now'
        ];
        return badPhrases.some(bp => lower.includes(bp));
    }

    /**
     * Extract Merchant / Payee with multiline support
     */
    function extractMerchant(text) {
        if (!text) return { value: '', confidence: 'NEEDS_CONFIRMATION', score: 0 };
        const clean = cleanText(text);
        const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

        // 1. Highest Priority: "Banking Name: Raju Dinkar Patil" or "Beneficiary Name: ..."
        const bankingMatch = clean.match(/(?:banking\s+name|beneficiary\s+name|payee\s+name)[:\s]+([^\n\r,]+)/i);
        if (bankingMatch && bankingMatch[1]) {
            const name = cleanPayeeName(bankingMatch[1]);
            if (name) {
                return { value: name, confidence: 'HIGH', score: 95, reason: 'Explicit Banking Name field' };
            }
        }

        // 2. Multiline "Paid to" or "Sent to" block
        for (let i = 0; i < lines.length; i++) {
            if (/^(?:paid\s+to|payment\s+to|sent\s+to)$/i.test(lines[i])) {
                for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
                    const line = lines[j];
                    if (/^[\[(]?[A-Z]{1,3}[\])]?$/.test(line)) continue; // skip avatar initials e.g. "RP"
                    if (isSystemStatusLabel(line)) continue;
                    if (/\b(?:am|pm|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i.test(line)) continue; // skip date/time
                    if (/@/.test(line)) continue; // skip UPI ID / email
                    if (/^(?:[₹]|Rs\.?|INR|\d|[.*=-])+/i.test(line)) continue; // skip numbers/rupees

                    let name = cleanPayeeName(line);

                    // Check if name continues on the next line (multiline support e.g. "Raju Dinkar \n Patil")
                    if (j + 1 < lines.length) {
                        const nextLine = lines[j + 1];
                        if (!isSystemStatusLabel(nextLine) && !/@/.test(nextLine) && !/^(?:[₹]|\d)/.test(nextLine)) {
                            const nextClean = cleanPayeeName(nextLine);
                            if (nextClean && nextClean.length >= 2 && !/^(?:transfer|debited|utr|time|date)/i.test(nextClean)) {
                                name = `${name} ${nextClean}`;
                            }
                        }
                    }

                    if (name && name.length >= 2) {
                        return { value: name, confidence: 'HIGH', score: 90, reason: 'Paid to section recipient' };
                    }
                }
            }
        }

        // 3. Inline "Paid ₹250 to ABC"
        const inlineMatch = clean.match(/(?:paid|sent|payment\s+of)\s+(?:to\s+)?(?:[₹]|Rs\.?|INR)?\s*[0-9,.]*\s*(?:to\s+)?([^.\n\r,]+?)(?:\s+(?:via|using|on|successful|completed|for|ref|upi|utr|from|\()|\.|\n|$)/i);
        if (inlineMatch && inlineMatch[1]) {
            const name = cleanPayeeName(inlineMatch[1]);
            if (name && !isSystemStatusLabel(name)) {
                return { value: name, confidence: 'MEDIUM', score: 75, reason: 'Inline payee pattern' };
            }
        }

        // 4. "Received from ABC"
        const recMatch = clean.match(/(?:received\s+from|transfer\s+from)\s+([^.\n\r,]+?)(?:\s+(?:via|using|on|ref|upi|utr|\()|\.|\n|$)/i);
        if (recMatch && recMatch[1]) {
            const name = cleanPayeeName(recMatch[1]);
            if (name && !isSystemStatusLabel(name)) {
                return { value: name, confidence: 'MEDIUM', score: 75, reason: 'Received from pattern' };
            }
        }

        return { value: '', confidence: 'NEEDS_CONFIRMATION', score: 0 };
    }

    // ========================================================================
    // UTR / REFERENCE ID EXTRACTION
    // ========================================================================

    /**
     * Extract 12-digit UTR or transaction ID
     */
    function extractReferenceId(text) {
        if (!text) return { value: '', confidence: 'NEEDS_CONFIRMATION' };
        const clean = cleanText(text);

        // 1. Explicit 12-digit UTR / UPI Ref (handles OCR spaces like "5985 7075 5261")
        const utrRegex = /(?:UTR(?:\s*No\.?|\s*Number)?|UPI\s*Ref(?:erence)?(?:\s*No\.?)?)[:\s#]*([0-9\s]{12,16})\b/i;
        const utrMatch = clean.match(utrRegex);
        if (utrMatch && utrMatch[1]) {
            const digits = utrMatch[1].replace(/\s+/g, '');
            if (digits.length === 12) {
                return { value: digits, confidence: 'HIGH', reason: 'Explicit 12-digit UTR label' };
            }
        }

        // 2. Standalone 12-digit UPI reference number starting with 1-9
        const standalone12 = clean.match(/\b([1-9]\d{11})\b/);
        if (standalone12 && standalone12[1]) {
            return { value: standalone12[1].trim(), confidence: 'HIGH', reason: 'Standalone 12-digit UPI reference number' };
        }

        // 3. PhonePe Transaction ID (e.g. T2609231832354342833797)
        const txnMatch = clean.match(/(?:PhonePe\s*Transaction\s*ID|Transaction\s*ID|Txn\s*ID)[:\s#]*([a-zA-Z0-9]{12,28})/i);
        if (txnMatch && txnMatch[1]) {
            return { value: txnMatch[1].trim(), confidence: 'MEDIUM', reason: 'Transaction ID label' };
        }

        return { value: '', confidence: 'NEEDS_CONFIRMATION' };
    }

    // ========================================================================
    // CATEGORY INFERENCE ENGINE
    // ========================================================================

    /**
     * Map category from merchant name & transaction context
     */
    function inferCategory(merchantName, text) {
        const full = `${merchantName || ''} ${text || ''}`.toLowerCase();

        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const kw of keywords) {
                const regex = new RegExp(`\\b${kw}\\b`, 'i');
                if (regex.test(full)) {
                    return {
                        value: category,
                        confidence: 'HIGH',
                        matchedKeyword: kw,
                        needsSelection: false
                    };
                }
            }
        }

        // If unknown, require user selection
        return {
            value: '',
            confidence: 'NEEDS_CONFIRMATION',
            matchedKeyword: null,
            needsSelection: true
        };
    }

    // ========================================================================
    // MAIN PARSER ENTRYPOINT
    // ========================================================================

    /**
     * Parse payment text or rich multi-pass structured OCR payload
     */
    function parsePaymentText(input) {
        let rawText = '';
        let linesData = null;
        let passesRun = [1];
        let accompanyingText = '';

        if (typeof input === 'string') {
            rawText = input;
        } else if (input && typeof input === 'object') {
            rawText = input.text || '';
            accompanyingText = input.accompanyingText || '';
            if (input.spatialData && Array.isArray(input.spatialData.lines)) {
                linesData = input.spatialData.lines;
            }
            if (Array.isArray(input.passesRun)) {
                passesRun = input.passesRun;
            }
        }

        const provider = detectProvider(rawText);

        // 1. Amount
        const amountCandidates = extractAmountCandidates(rawText, linesData);
        const amountRes = resolveAmount(amountCandidates);

        // 2. Date
        const dateCandidates = extractDateCandidates(rawText, linesData);
        const dateRes = resolveDate(dateCandidates);

        // 3. Time
        const timeRes = extractTime(rawText);

        // 4. Merchant
        const merchantRes = extractMerchant(rawText);

        // 5. UTR
        const utrRes = extractReferenceId(rawText);

        // 6. Category
        const catRes = inferCategory(merchantRes.value, rawText);

        // Cross-validation & overall confidence
        const requiresAmountConfirm = amountRes.requiresConfirmation || amountRes.value === null;
        const requiresDateConfirm = dateRes.requiresConfirmation || dateRes.value === null;
        const overallRequiresConfirm = requiresAmountConfirm || requiresDateConfirm;

        let overallConfidence = 'HIGH';
        if (overallRequiresConfirm || amountRes.confidence === 'NEEDS_CONFIRMATION' || dateRes.confidence === 'NEEDS_CONFIRMATION') {
            overallConfidence = 'NEEDS_CONFIRMATION';
        } else if (amountRes.confidence === 'MEDIUM' || dateRes.confidence === 'MEDIUM') {
            overallConfidence = 'MEDIUM';
        }

        // Developer-only diagnostic data (Section 25: NO secrets or tokens logged)
        const diagnostic = {
            passesRun,
            provider,
            amountCandidates: amountCandidates.map(c => ({ amount: c.amount, score: c.score, reason: c.reason })),
            dateCandidates: dateCandidates.map(d => ({ date: d.isoDate, score: d.score, reason: d.reason })),
            merchantCandidate: merchantRes.value,
            utrCandidate: utrRes.value,
            selected: {
                amount: amountRes.value,
                date: dateRes.value,
                time: timeRes.value,
                merchant: merchantRes.value,
                utr: utrRes.value
            },
            reasons: {
                amount: amountRes.reason,
                date: dateRes.reason
            }
        };

        return {
            // Backward-compatible fields
            rawText,
            amount: amountRes.value,
            merchant: merchantRes.value,
            date: dateRes.value, // NEVER today's date! null if not found
            time: timeRes.value,
            referenceId: utrRes.value,
            paymentMethod: provider === 'UPI' ? 'UPI' : (provider.endsWith('UPI') ? provider : `${provider} UPI`),
            category: catRes.value,
            needsCategorySelection: catRes.needsSelection,
            note: '',
            type: 'expense',

            // New rich structured extraction results
            provider,
            amountConfidence: amountRes.confidence,
            amountScore: amountRes.score,
            dateConfidence: dateRes.confidence,
            dateScore: dateRes.score,
            overallConfidence,
            requiresConfirmation: overallRequiresConfirm,
            requiresAmountConfirmation: requiresAmountConfirm,
            requiresDateConfirmation: requiresDateConfirm,
            diagnostic
        };
    }

    /**
     * Generates a neutral Wallet-controlled attachment filename.
     * CRITICAL PRIVACY: The filename must NEVER be derived from OCR content
     * (no merchant, person's name, amount, UTR, phone, account number, or OCR text).
     * Format: wallet_payment_YYYYMMDD_HHmmss_<short-random-id>.png
     * Example: wallet_payment_20260927_113045_a7f3.png
     */
    function generateNeutralAttachmentFileName(date = new Date(), extension = 'png') {
        const d = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const HH = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        const randomHex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
        const cleanExt = (extension || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
        return `wallet_payment_${yyyy}${MM}${dd}_${HH}${mm}${ss}_${randomHex}.${cleanExt}`;
    }

    /**
     * Validates that a filename contains no forbidden characters for Android storage
     * and adheres strictly to the neutral Wallet-controlled privacy format.
     * Forbidden: / \ : * ? " < > | \n \r
     */
    function isSafeStorageFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') return false;
        // Check forbidden characters
        if (/[\/\\:\*\?"<>\|\r\n]/.test(fileName)) return false;
        // Preferred neutral format: wallet_payment_YYYYMMDD_HHmmss_<id>.ext
        return /^wallet_payment_\d{8}_\d{6}_[a-z0-9]{4,8}\.[a-z0-9]+$/i.test(fileName);
    }

    return {
        parsePaymentText,
        extractAmountCandidates,
        resolveAmount,
        extractDateCandidates,
        resolveDate,
        extractMerchant,
        extractReferenceId,
        extractTime,
        inferCategory,
        detectProvider,
        isValidCalendarDate,
        formatDateISO,
        generateNeutralAttachmentFileName,
        isSafeStorageFileName
    };
}));
