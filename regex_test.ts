
const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const testRegex = () => {
    const word = "гаи";
    const text = "гаи поменять права";

    // Original implementation
    const regex = new RegExp("\\b" + escapeRegExp(word) + "\\b", "i");
    const match = regex.test(text);

    console.log(`Word: '${word}'`);
    console.log(`Text: '${text}'`);
    console.log(`Regex: ${regex}`);
    console.log(`Match (Original): ${match}`); // Expect false if \b fails for Cyrillic

    // Proposed implementation (custom boundary)
    // Boundary is start of string OR non-word char (including space, punctuation)
    // Non-word char for Cyrillic needs to be carefully defined or allow anything that is NOT a cyrillic/latin letter/digit.
    // Or we can use negative lookahead/lookbehind if supported, but JS in Apps Script is ES2020 which supports lookbehind.

    // Simple approach:
    // (^|[^a-zA-Z0-9а-яА-ЯёЁ])word([^a-zA-Z0-9а-яА-ЯёЁ]|$)
    const boundary = "(^|[^a-zA-Z0-9а-яА-ЯёЁ])";
    const boundaryEnd = "([^a-zA-Z0-9а-яА-ЯёЁ]|$)";
    const newRegex = new RegExp(boundary + escapeRegExp(word) + boundaryEnd, "i");
    const newMatch = newRegex.test(text);

    console.log(`New Regex: ${newRegex}`);
    console.log(`Match (New): ${newMatch}`);

    // Test cases
    const cases = [
        { word: "гаи", text: "гаишник", expected: false },
        { word: "гаи", text: "в гаи", expected: true },
        { word: "гаи", text: "гаи.", expected: true },
        { word: "car", text: "carpet", expected: false },
        { word: "car", text: "rent car", expected: true }
    ];

    cases.forEach(c => {
        const r = new RegExp(boundary + escapeRegExp(c.word) + boundaryEnd, "i");
        const m = r.test(c.text);
        console.log(`Case '${c.word}' in '${c.text}' -> ${m} (Expected: ${c.expected})`);
    });
}

testRegex();
