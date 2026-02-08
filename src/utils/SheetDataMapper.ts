export class SheetDataMapper {
    private headers: string[];
    private headerMap: Map<string, number>;

    constructor(headers: string[]) {
        this.headers = headers;
        this.headerMap = new Map();
        headers.forEach((header, index) => {
            this.headerMap.set(header, index);
        });
    }

    /**
     * Converts a row array to an object using column headers as keys.
     */
    toObject(row: any[]): Record<string, any> {
        const obj: Record<string, any> = {};
        this.headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    }

    /**
     * Converts an object to a row array based on the header order.
     * Missing keys in the object will result in empty strings in the array.
     */
    toArray(obj: Record<string, any>): any[] {
        return this.headers.map(header => {
            const val = obj[header];
            return val === undefined || val === null ? "" : val;
        });
    }

    /**
     * Validates that the sheet contains the required headers.
     * Throws an error if any required header is missing.
     */
    validateHeaders(requiredHeaders: string[]): void {
        const missing = requiredHeaders.filter(h => !this.headerMap.has(h));
        if (missing.length > 0) {
            throw new Error(`Missing required headers: ${missing.join(", ")}`);
        }
    }

    /**
     * Returns the index of a specific header.
     * @returns index or -1 if not found.
     */
    getColumnIndex(header: string): number {
        return this.headerMap.has(header) ? this.headerMap.get(header)! : -1;
    }
}
