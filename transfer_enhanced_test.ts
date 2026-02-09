
const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === 'number') return value;

    let str = String(value).trim();
    str = str.replace(/\s+/g, '');
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
        else str = str.replace(/,/g, '');
    } else if (str.includes(',')) str = str.replace(',', '.');

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

const testEnhancedTransfer = () => {
    // Requirements:
    // 1. Existing Clean Data keywords should block duplicates from Raw Data.
    // 2. Negative Keywords from Intent Types should block Raw Data.

    const existingClean = new Set(["old keyword"]);
    const negativeWords = ["bad", "remove"];

    const rawData = [
        { Keyword: "old keyword", Searches: "100" }, // Duplicate existing -> Skip
        { Keyword: "new keyword", Searches: "50" }, // New -> Keep
        { Keyword: "bad keyword", Searches: "10" }, // Negative -> Skip
        { Keyword: "remove me", Searches: "20" },   // Negative -> Skip
        { Keyword: "good keyword", Searches: "200" } // New -> Keep
    ];

    const cleanDataAppended: any[] = [];

    console.log("Starting Enhanced Transfer Test...");

    // Mock Logic
    const boundary = "(^|[^a-zA-Z0-9а-яА-ЯёЁ])";
    const boundaryEnd = "([^a-zA-Z0-9а-яА-ЯёЁ]|$)";
    const matchers = negativeWords.map(word => ({
        text: word,
        regex: new RegExp(boundary + escapeRegExp(word) + boundaryEnd, "i")
    }));

    rawData.forEach(row => {
        const keyword = String(row.Keyword || "").trim();
        const lowerKeyword = keyword.toLowerCase();

        // 1. Check Existing
        if (existingClean.has(lowerKeyword)) {
            console.log(` -> Removed: Exists in Clean Data '${keyword}'`);
            return;
        }

        // 2. Check Negatives
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
            console.log(` -> Removed: Negative match '${keyword}'`);
            return;
        }

        cleanDataAppended.push(row);
        console.log(` -> Appended: '${keyword}'`);
    });

    // Assertions
    if (cleanDataAppended.length === 2 &&
        cleanDataAppended[0].Keyword === "new keyword" &&
        cleanDataAppended[1].Keyword === "good keyword") {
        console.log("\nSUCCESS: Enhanced transfer verification passed.");
    } else {
        console.log("\nFAILURE: Enhanced transfer verification failed.");
    }
}

testEnhancedTransfer();
