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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Data Cleaning Section */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Data Preparation</h4>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        disabled={!!loading}
                        onClick={() => runTask('Remove Duplicates', 'handleRemoveDuplicates')}
                        className="group relative flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left active:scale-[0.98]"
                    >
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                        </div>
                        <div className="ml-4 flex-1">
                            <h5 className="text-sm font-semibold text-gray-900">Remove Duplicates</h5>
                            <p className="text-xs text-gray-500">Clean raw data in active sheet</p>
                        </div>
                    </button>

                    <button
                        disabled={!!loading}
                        onClick={() => runTask('Collect Negatives', 'handleCollectNegatives')}
                        className="group relative flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-200 text-left active:scale-[0.98]"
                    >
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></svg>
                        </div>
                        <div className="ml-4 flex-1">
                            <h5 className="text-sm font-semibold text-gray-900">Collect Negatives</h5>
                            <p className="text-xs text-gray-500">Find negative keywords</p>
                        </div>
                    </button>

                    <button
                        disabled={!!loading}
                        onClick={() => runTask('Clean Keys', 'handleCleanKeysFromNegatives')}
                        className="group relative flex items-center w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 text-left active:scale-[0.98]"
                    >
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                        </div>
                        <div className="ml-4 flex-1">
                            <h5 className="text-sm font-semibold text-gray-900">Clean Keys</h5>
                            <p className="text-xs text-gray-500">Remove matches</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Analysis Section */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Analysis</h4>

                <button
                    disabled={!!loading}
                    onClick={() => runTask('Clustering', 'handleRunClustering')}
                    className="w-full relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-lg">Run Clustering</span>
                            <span className="text-white/80 text-xs mt-0.5">Process keywords via API</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                    </div>

                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-2 -ml-2 w-16 h-16 bg-black/10 rounded-full blur-xl"></div>
                </button>

                <button
                    disabled={!!loading}
                    onClick={() => runTask('Check Status', 'handleCheckLastTask')}
                    className="w-full flex items-center justify-center p-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Check Task Status
                </button>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                        <span className="text-sm font-medium text-indigo-700">Running {loading}...</span>
                    </div>
                </div>
            )}
        </div>
    );
};
