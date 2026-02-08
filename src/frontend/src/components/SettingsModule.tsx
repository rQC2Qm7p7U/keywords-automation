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
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔑</span> API Configuration
                </h3>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Arsenkin Token</label>
                    <div className="flex space-x-2">
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Enter API Token"
                        />
                        <button
                            onClick={handleSaveToken}
                            className="px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-md hover:bg-slate-700 transition"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🌍</span> Region Selection
                </h3>
                <RegionSelector />
            </div>
        </div>
    );
};
