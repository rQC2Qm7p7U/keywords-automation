import React from 'react';

export const Header: React.FC = () => (
    <header className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md">
        <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-wide">Automated Keywords</h1>
            <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">v2.0</span>
        </div>
    </header>
);
