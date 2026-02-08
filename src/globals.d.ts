// Global constants are defined in Config.ts and Messages.ts
// and are available in the global scope of the project.

declare var API: {
    ARSENKIN: {
        BASE_URL: string;
        CHECK_URL: string;
        RESULT_URL: string;
    }
};


// Global function declarations
declare function createStructure(): void;
declare function removeDuplicates(data: any[][]): { uniqueData: any[][]; removedCount: number };
declare function getSheetData(sheetName: string): any[][];
declare function updateSheetData(sheetName: string, data: any[][]): void;
declare function collectNegativeKeywords(): number;
declare function transferRawToClean(): number;
declare function cleanKeysFromNegatives(): number;
declare function runClustering(confirm?: boolean): any;
declare function manuallyCheckLastTask(): any;
declare function setApiToken(token: string): void;
declare function createProjectMenu(): void;

// Missing logic vars
declare let defaultRegionSearch: string;
declare let defaultRegionName: string;
