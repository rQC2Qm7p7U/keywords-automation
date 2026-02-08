
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsModule } from '../SettingsModule';
import { GAS } from '../../utils/gas';

vi.mock('../../utils/gas', () => ({
    GAS: {
        run: vi.fn()
    }
}));

describe('SettingsModule', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (GAS.run as any).mockImplementation((fn: string) => {
            if (fn === 'getSettings') {
                return Promise.resolve({
                    arsenkinToken: 'TEST_TOKEN'
                });
            }
            return Promise.resolve();
        });
    });

    it('loads and displays settings', async () => {
        render(<SettingsModule />);
        // Only checking for Token
        await waitFor(() => {
            expect(screen.getByDisplayValue('TEST_TOKEN')).toBeInTheDocument();
        });
    });

    it('updates inputs and saves settings', async () => {
        const { container } = render(<SettingsModule />);
        await waitFor(() => screen.getByDisplayValue('TEST_TOKEN'));

        // Input is type="password"
        const tokenInput = container.querySelector('input[type="password"]');
        if (!tokenInput) throw new Error("Token input not found");

        fireEvent.change(tokenInput, { target: { value: 'NEW_TOKEN' } });

        const saveBtn = screen.getByText('Save');
        fireEvent.click(saveBtn);

        expect(GAS.run).toHaveBeenCalledWith('saveSettings', expect.objectContaining({
            arsenkinToken: 'NEW_TOKEN'
        }));
    });
});
