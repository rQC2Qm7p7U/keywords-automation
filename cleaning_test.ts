
const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === 'number') return value;
    return parseFloat(String(value));
}

// Mock of the cleaning logic to test the core rules
const testCleaningLogic = () => {
    // Requirements:
    // 1. Remove empty Keywords
    // 2. Remove duplicate Keywords (keep first)
    // 3. Remove rows with 0 or empty Avg. searches

    const mockData = [
        { Keyword: "good keyword", Searches: 100 }, // Keep
        { Keyword: "", Searches: 100 },            // Remove (Empty)
        { Keyword: "  ", Searches: 100 },          // Remove (Empty trim)
        { Keyword: "good keyword", Searches: 50 }, // Remove (Duplicate)
        { Keyword: "low volume", Searches: 0 },    // Remove (Zero searches)
        { Keyword: "no volume", Searches: "" },    // Remove (Empty searches -> 0)
        { Keyword: "negative match", Searches: 100 } // Remove (Negative match)
    ];

    const negatives = ["negative"];
    const seenKeywords = new Set<string>();

    // Regex setup
    const boundary = "(^|[^a-zA-Z0-9а-яА-ЯёЁ])";
    const boundaryEnd = "([^a-zA-Z0-9а-яА-ЯёЁ]|$)";
    const matchers = negatives.map(word => ({
        text: word,
        regex: new RegExp(boundary + escapeRegExp(word) + boundaryEnd, "i")
    }));

    console.log("Starting Cleaning Logic Test...");

    const filtered = mockData.filter(row => {
        const keyword = String(row.Keyword || "").trim();

        // 1. Empty check
        if (!keyword) {
            console.log(`Removed: Empty keyword`);
            return false;
        }

        const lowerKeyword = keyword.toLowerCase();

        // 2. Duplicate check
        if (seenKeywords.has(lowerKeyword)) {
            console.log(`Removed: Duplicate '${keyword}'`);
            return false;
        }
        seenKeywords.add(lowerKeyword);

        // 3. Searches check
        const searches = parseNumber(row.Searches);
        if (searches <= 0) {
            console.log(`Removed: Low searches '${keyword}' (${searches})`);
            return false;
        }

        // 4. Negative check
        let isNegative = false;
        for (const matcher of matchers) {
            if (lowerKeyword.includes(matcher.text)) {
                if (matcher.regex.test(keyword)) {
                    isNegative = true;
                    break;
                }
            }
        }

        if (isNegative) {
            console.log(`Removed: Negative match '${keyword}'`);
            return false;
        }

        return true;
    });

    console.log("\nResults:");
    filtered.forEach(r => console.log(`Kept: '${r.Keyword}' (${r.Searches})`));

    // Assertions
    const expectedCount = 1; // Only "good keyword" (first one)
    if (filtered.length === expectedCount && filtered[0].Keyword === "good keyword") {
        console.log("\nSUCCESS: Logic verification passed.");
    } else {
        console.log("\nFAILURE: Logic verification failed.");
    }
}

testCleaningLogic();
