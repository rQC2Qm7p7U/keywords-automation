
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolsModule } from '../ToolsModule';
import { GAS } from '../../utils/gas';

// Mock GAS
vi.mock('../../utils/gas', () => ({
    GAS: {
        run: vi.fn()
    }
}));

describe('ToolsModule', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.confirm to always return true
        window.confirm = vi.fn().mockReturnValue(true);
        window.alert = vi.fn();
    });

    it('renders all action buttons', () => {
        render(<ToolsModule />);
        expect(screen.getByText('Remove Duplicates')).toBeInTheDocument();
        expect(screen.getByText('Collect Negatives')).toBeInTheDocument();
        expect(screen.getByText('Clean Keys')).toBeInTheDocument();
        expect(screen.getByText('Run Clustering')).toBeInTheDocument();
        expect(screen.getByText('Check Task Status')).toBeInTheDocument();
    });

    it('triggers GAS.run when Remove Duplicates is clicked', async () => {
        (GAS.run as any).mockResolvedValue('Success');
        render(<ToolsModule />);

        const btn = screen.getByText('Remove Duplicates').closest('button');
        fireEvent.click(btn!);

        expect(window.confirm).toHaveBeenCalled();
        expect(GAS.run).toHaveBeenCalledWith('handleRemoveDuplicates');

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('complete'));
        });
    });

    it('shows loading state during execution', async () => {
        // Delay resolution
        (GAS.run as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
        render(<ToolsModule />);

        const btn = screen.getByText('Collect Negatives').closest('button');
        fireEvent.click(btn!);

        expect(screen.getByText(/Running Collect Negatives/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText(/Running/i)).not.toBeInTheDocument();
        });
    });

    it('handles errors from GAS', async () => {
        (GAS.run as any).mockRejectedValue(new Error('Script Error'));
        render(<ToolsModule />);

        const btn = screen.getByText('Clean Keys').closest('button');
        fireEvent.click(btn!);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Error: Script Error');
        });
    });
});
