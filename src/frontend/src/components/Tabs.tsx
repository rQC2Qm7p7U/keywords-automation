import React from 'react';

interface TabProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => (
    <button
        className={`flex-1 py-2 text-sm font-medium transition-colors duration-200 border-b-2 ${isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        onClick={onClick}
    >
        {label}
    </button>
);

interface TabsProps {
    tabs: string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => (
    <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
            <Tab
                key={tab}
                label={tab}
                isActive={activeTab === tab}
                onClick={() => onTabChange(tab)}
            />
        ))}
    </div>
);
