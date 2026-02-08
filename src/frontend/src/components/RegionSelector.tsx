import React, { useState, useEffect } from 'react';
import { GAS } from '../utils/gas';

interface Region {
    name: string;
    id: string;
}

export const RegionSelector: React.FC = () => {
    const [regions, setRegions] = useState<Region[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        GAS.run('getRegions')
            .then((data: string[][]) => {
                // data is [[Name, ID], ...]
                const mapped = data.map(([name, id]) => ({ name, id }));
                setRegions(mapped);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch regions", err);
                setLoading(false);
            });

        // Also fetch current setting
        GAS.run('getSettings').then((settings: any) => {
            if (settings.region) setSelectedRegion(settings.region);
        });
    }, []);

    const filteredRegions = regions.filter((r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (id: string) => {
        setSelectedRegion(id);
        GAS.run('saveSettings', { region: id }).then(() => {
            // success toast?
        });
    };

    if (loading) return <div className="text-sm text-gray-400">Loading regions...</div>;

    return (
        <div className="flex flex-col space-y-2">
            <input
                type="text"
                placeholder="Search region..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                {filteredRegions.length === 0 ? (
                    <div className="p-2 text-sm text-gray-400">No regions found</div>
                ) : (
                    filteredRegions.map((region) => (
                        <div
                            key={region.id}
                            className={`p-2 text-sm cursor-pointer hover:bg-blue-50 transition ${selectedRegion === region.id ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                                }`}
                            onClick={() => handleSelect(region.id)}
                        >
                            <div className="flex justify-between">
                                <span>{region.name}</span>
                                <span className="text-xs text-gray-400">{region.id}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {selectedRegion && (
                <div className="text-xs text-green-600 mt-1">
                    Selected ID: {selectedRegion}
                </div>
            )}
        </div>
    );
};
