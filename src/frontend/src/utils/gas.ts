/**
 * Promisified wrapper for google.script.run
 */
export const GAS = {
    run: (functionName: string, ...args: any[]): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!(window as any).google || !(window as any).google.script) {
                // Mock for local development
                console.log(`[DEV] GAS.run(${functionName})`, args);
                if (functionName === 'getSettings') {
                    resolve({ arsenkinToken: 'TEST_TOKEN', region: '100' });
                } else if (functionName === 'getRegions') {
                    resolve([['Moscow', '213'], ['St. Petersburg', '2']]);
                } else {
                    resolve("Mock Success");
                }
                return;
            }

            (window as any).google.script.run
                .withSuccessHandler((result: any) => resolve(result))
                .withFailureHandler((error: any) => reject(error))
            [functionName](...args);
        });
    }
};
