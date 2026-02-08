
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegionSelector } from '../RegionSelector';
import { GAS } from '../../utils/gas';

vi.mock('../../utils/gas', () => ({
    GAS: {
        run: vi.fn()
    }
}));

describe('RegionSelector', () => {
    const mockRegions = [['Moscow', '213'], ['London', '100']];

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks
        (GAS.run as any).mockImplementation((fn: string) => {
            if (fn === 'getRegions') return Promise.resolve(mockRegions);
            if (fn === 'getSettings') return Promise.resolve({ region: '213' });
            return Promise.resolve();
        });
    });

    it('renders loading initially then regions', async () => {
        render(<RegionSelector />);
        expect(screen.getByText(/Loading/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Moscow')).toBeInTheDocument();
            expect(screen.getByText('London')).toBeInTheDocument();
        });
    });

    it('filters regions based on search input', async () => {
        render(<RegionSelector />);
        await waitFor(() => screen.getByText('Moscow'));

        const input = screen.getByPlaceholderText('Search region...');
        fireEvent.change(input, { target: { value: 'lon' } });

        expect(screen.queryByText('Moscow')).not.toBeInTheDocument();
        expect(screen.getByText('London')).toBeInTheDocument();
    });

    it('selects a region and saves settings', async () => {
        render(<RegionSelector />);
        await waitFor(() => screen.getByText('London'));

        fireEvent.click(screen.getByText('London'));

        expect(GAS.run).toHaveBeenCalledWith('saveSettings', { region: '100' });

        // Check highlight (implementation detail: class checking or state text)
        expect(screen.getByText('Selected ID: 100')).toBeInTheDocument();
    });

    it('loads saved region from settings', async () => {
        render(<RegionSelector />);

        await waitFor(() => {
            expect(screen.getByText('Selected ID: 213')).toBeInTheDocument();
        });
    });
});
