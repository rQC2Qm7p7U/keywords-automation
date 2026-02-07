/**
 * Keywords.gs
 * Domain logic for keyword transformations and processing.
 * Pure functions, no SpreadsheetApp dependencies.
 */

/**
 * Removes duplicate rows based on the first column (Keyword).
 *
 * @param {Array<Array<string>>} data - The 2D array of data.
 * @return {Object} Result object containing unique data and removed count.
 */
function removeDuplicates(data) {
  if (!data || data.length === 0) {
    return { uniqueData: [], removedCount: 0 };
  }

  const seen = new Set();
  const uniqueData = [];
  let removedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const keyword = row[0]; // Assuming Column A is index 0

    if (seen.has(keyword)) {
      removedCount++;
    } else {
      seen.add(keyword);
      uniqueData.push(row);
    }
  }

  return {
    uniqueData: uniqueData,
    removedCount: removedCount
  };
}
