
import { render, screen, fireEvent } from '@testing-library/react';

import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders without crashing', () => {
        render(<App />);
        expect(screen.getByText(/Keywords Automation/i)).toBeInTheDocument();
    });

    it('switches tabs correctly', async () => {
        render(<App />);

        // Default Tab is Tools
        expect(screen.getByText('Data Preparation')).toBeInTheDocument();

        // Click Settings
        const settingsTab = screen.getByText('Settings');
        fireEvent.click(settingsTab);

        // Verify Settings content is shown and async data loads
        // The mock in gas.ts returns 'TEST_TOKEN' for getSettings
        await screen.findByDisplayValue('TEST_TOKEN');

        // Also check for RegionSelector content (mock returns regions)
        // Expected mock region: 'Moscow'
        expect(screen.getByText('Target Region')).toBeInTheDocument();
    });
});
