import React, { useEffect, useState } from 'react';
import { RegionSelector } from './RegionSelector';
import { GAS } from '../utils/gas';

export const SettingsModule: React.FC = () => {
    const [token, setToken] = useState('');

    useEffect(() => {
        GAS.run('getSettings').then((settings: any) => {
            if (settings.arsenkinToken) setToken(settings.arsenkinToken);
        });
    }, []);

    const handleSaveToken = () => {
        GAS.run('saveSettings', { arsenkinToken: token }).then(() => {
            alert("Token saved!");
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* API Config Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm flex items-center">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs">🔑</span>
                        API Configuration
                    </h3>
                </div>

                <div className="p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Arsenkin Access Token</label>
                    <div className="relative">
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="block w-full pl-3 pr-16 py-2.5 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-gray-50 focus:bg-white"
                            placeholder="• • • • • • • •"
                        />
                        <button
                            onClick={handleSaveToken}
                            className="absolute right-1 top-1 bottom-1 px-3 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 rounded-md text-xs font-medium transition-all shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 leading-tight">
                        Required for clustering operations. Your token is stored securely in your script properties.
                    </p>
                </div>
            </div>

            {/* Region Select Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-sm flex items-center">
                        <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center mr-2 text-xs">🌍</span>
                        Target Region
                    </h3>
                </div>
                <div className="p-4">
                    <RegionSelector />
                </div>
            </div>
        </div>
    );
};
