
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

const testTransferLogic = () => {
    // Rules:
    // 1. Filter Empty Keywords
    // 2. Filter Duplicate Keywords
    // 3. Filter Searches <= 0
    // 4. Format numbers: Searches (int), Others (2 decimals)

    const rawData = [
        { Keyword: "good keyword", Searches: "100.5", CPC: "1.234" }, // Format: 101, 1.23
        { Keyword: "", Searches: "100" }, // Skip (Empty)
        { Keyword: "good keyword", Searches: "50" }, // Skip (Duplicate)
        { Keyword: "low volume", Searches: "0" }, // Skip (Zero)
        { Keyword: "bad number", Searches: "abc", CPC: "1,555" } // Skip (Zero parsed search), Format CPC 1.56?
    ];

    const cleanData: any[] = [];
    const seenKeywords = new Set<string>();

    console.log("Starting Transfer Logic Test...");

    rawData.forEach(row => {
        const keyword = String(row.Keyword || "").trim();
        let searches = parseNumber(row.Searches);
        let cpc = parseNumber(row.CPC);

        // Formatting
        searches = Math.round(searches);
        cpc = parseFloat(cpc.toFixed(2));

        console.log(`Processing '${keyword}': Searches=${searches}, CPC=${cpc}`);

        // Filtering
        if (!keyword) {
            console.log(` -> Removed: Empty keyword`);
            return;
        }

        const lowerKeyword = keyword.toLowerCase();
        if (seenKeywords.has(lowerKeyword)) {
            console.log(` -> Removed: Duplicate`);
            return;
        }
        seenKeywords.add(lowerKeyword);

        if (searches <= 0) {
            console.log(` -> Removed: Low searches`);
            return;
        }

        cleanData.push({ Keyword: keyword, Searches: searches, CPC: cpc });
        console.log(` -> Kept`);
    });

    console.log("\nFinal Clean Data:");
    cleanData.forEach(r => console.log(JSON.stringify(r)));

    // Assertions
    if (cleanData.length === 1 && cleanData[0].Keyword === "good keyword" && cleanData[0].Searches === 101 && cleanData[0].CPC === 1.23) {
        console.log("\nSUCCESS: Transfer logic verification passed.");
    } else {
        console.log("\nFAILURE: Transfer logic verification failed.");
    }
}

testTransferLogic();
