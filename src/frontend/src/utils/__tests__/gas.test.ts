
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GAS } from '../gas';

describe('GAS Utility', () => {
    const originalGoogle = (window as any).google;

    beforeEach(() => {
        // Reset window.google before each test
        delete (window as any).google;
    });

    afterEach(() => {
        // Restore window.google
        (window as any).google = originalGoogle;
        vi.restoreAllMocks();
    });

    it('should use mock data when google.script is not available (Dev Mode)', async () => {
        console.log = vi.fn(); // Suppress logs

        const result = await GAS.run('someFunction', 'arg1');
        expect(result).toBe('Mock Success');
        expect(console.log).toHaveBeenCalled();
    });

    it('should return specific mocks for getSettings', async () => {
        const result = await GAS.run('getSettings');
        expect(result).toEqual({ arsenkinToken: 'TEST_TOKEN', region: '100' });
    });

    it('should call google.script.run when available', async () => {
        const mockRun = vi.fn();
        const mockSuccessHandler = vi.fn().mockReturnThis();
        const mockFailureHandler = vi.fn().mockReturnThis();

        (window as any).google = {
            script: {
                run: {
                    withSuccessHandler: mockSuccessHandler,
                    withFailureHandler: mockFailureHandler,
                    testFunc: mockRun
                }
            }
        };

        // We can't await easily because we need to manually trigger success/failure in the mock
        // So we'll implement the mock to call the handler immediately
        mockRun.mockImplementation(() => {
            const handler = mockSuccessHandler.mock.calls[0][0];
            handler('Server Result');
        });

        const promise = GAS.run('testFunc', 'arg1');

        await expect(promise).resolves.toBe('Server Result');
        expect(mockSuccessHandler).toHaveBeenCalled();
        expect(mockRun).toHaveBeenCalledWith('arg1');
    });

    it('should handle server errors', async () => {
        const mockRun = vi.fn();
        const mockSuccessHandler = vi.fn().mockReturnThis();
        const mockFailureHandler = vi.fn().mockReturnThis();

        (window as any).google = {
            script: {
                run: {
                    withSuccessHandler: mockSuccessHandler,
                    withFailureHandler: mockFailureHandler,
                    testFunc: mockRun
                }
            }
        };

        mockRun.mockImplementation(() => {
            const handler = mockFailureHandler.mock.calls[0][0];
            handler(new Error('Server Error'));
        });

        const promise = GAS.run('testFunc');

        await expect(promise).rejects.toThrow('Server Error');
    });
});
