import React, { useState } from 'react';
import { GAS } from '../utils/gas';

export const ToolsModule: React.FC = () => {
    const [loading, setLoading] = useState('');

    const runTask = (taskName: string, gasFunction: string) => {
        if (confirm(`Run ${taskName}?`)) {
            setLoading(taskName);
            GAS.run(gasFunction)
                .then(() => {
                    alert(`${taskName} complete!`);
                    setLoading('');
                })
                .catch(err => {
                    alert(`Error: ${err.message}`);
                    setLoading('');
                });
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-3">
                <button
                    disabled={!!loading}
                    onClick={() => runTask('Remove Duplicates', 'handleRemoveDuplicates')}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-indigo-300 group transition"
                >
                    <span className="font-medium text-gray-700 group-hover:text-indigo-600">Remove Duplicates</span>
                    <span className="text-gray-400 group-hover:text-indigo-400">→</span>
                </button>

                <button
                    disabled={!!loading}
                    onClick={() => runTask('Collect Negatives', 'handleCollectNegatives')}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-red-300 group transition"
                >
                    <span className="font-medium text-gray-700 group-hover:text-red-600">Collect Negatives</span>
                    <span className="text-gray-400 group-hover:text-red-400">→</span>
                </button>

                <button
                    disabled={!!loading}
                    onClick={() => runTask('Clean Keys', 'handleCleanKeysFromNegatives')}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-orange-300 group transition"
                >
                    <span className="font-medium text-gray-700 group-hover:text-orange-600">Clean Keys</span>
                    <span className="text-gray-400 group-hover:text-orange-400">→</span>
                </button>

                <button
                    disabled={!!loading}
                    onClick={() => runTask('Clustering', 'handleRunClustering')}
                    className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transform active:scale-95 transition"
                >
                    <span className="font-semibold">Run Clustering (API)</span>
                    <span>🚀</span>
                </button>

                <button
                    disabled={!!loading}
                    onClick={() => runTask('Check Status', 'handleCheckLastTask')}
                    className="flex items-center justify-center px-4 py-2 mt-4 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm font-medium transition"
                >
                    Check Last Task Status
                </button>

                {loading && (
                    <div className="text-center text-sm text-blue-600 animate-pulse mt-2">
                        Running: {loading}...
                    </div>
                )}
            </div>
        </div>
    );
};
