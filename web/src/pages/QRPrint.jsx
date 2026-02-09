import { useState, useEffect } from 'react';
import { RefreshCw, CheckSquare, Square, Download } from 'lucide-react';
import { locationApi, itemApi, wardrobeApi, qrApi } from '../services/api';

function QRPrint() {
    const [activeTab, setActiveTab] = useState('locations');
    const [loading, setLoading] = useState(true);

    // Data
    const [locations, setLocations] = useState([]);
    const [items, setItems] = useState([]);
    const [clothing, setClothing] = useState([]);

    // Selection
    const [selectedLocations, setSelectedLocations] = useState(new Set());
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectedClothing, setSelectedClothing] = useState(new Set());

    const loadData = async () => {
        try {
            const [locRes, itemRes, clothRes] = await Promise.all([
                locationApi.list(),
                itemApi.list(),
                wardrobeApi.listClothing(),
            ]);
            setLocations(locRes.data || []);
            setItems((itemRes.data || []).filter(i => i.item_type !== 'clothing'));
            setClothing(clothRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleSelection = (id, type) => {
        const setFn = type === 'locations' ? setSelectedLocations
            : type === 'items' ? setSelectedItems
                : setSelectedClothing;

        setFn(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const selectAll = (type) => {
        if (type === 'locations') setSelectedLocations(new Set(locations.map(l => l.id)));
        else if (type === 'items') setSelectedItems(new Set(items.map(i => i.id)));
        else setSelectedClothing(new Set(clothing.map(c => c.id)));
    };

    const deselectAll = (type) => {
        if (type === 'locations') setSelectedLocations(new Set());
        else if (type === 'items') setSelectedItems(new Set());
        else setSelectedClothing(new Set());
    };

    const generatePDF = () => {
        let ids = [];
        let type = 'locations';

        if (activeTab === 'locations') {
            ids = Array.from(selectedLocations);
            type = 'locations';
        } else if (activeTab === 'items') {
            ids = Array.from(selectedItems);
            type = 'items';
        } else {
            ids = Array.from(selectedClothing);
            type = 'items'; // Clothing is also items
        }

        if (ids.length === 0) {
            alert('Please select at least one item to print.');
            return;
        }

        const url = qrApi.getBulkPdfUrl(type, ids);
        window.open(url, '_blank');
    };

    const getCurrentData = () => {
        if (activeTab === 'locations') return locations;
        if (activeTab === 'items') return items;
        return clothing;
    };

    const getCurrentSelection = () => {
        if (activeTab === 'locations') return selectedLocations;
        if (activeTab === 'items') return selectedItems;
        return selectedClothing;
    };

    const currentData = getCurrentData();
    const currentSelection = getCurrentSelection();

    const tabs = [
        { id: 'locations', label: '📍 Locations', count: locations.length },
        { id: 'items', label: '📦 Items', count: items.length },
        { id: 'clothing', label: '👕 Clothing', count: clothing.length },
    ];

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <RefreshCw size={32} className="spinning" style={{ color: 'var(--color-text-muted)' }} />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">🖨️ Print QR Codes</h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: 1 }}
                    >
                        {tab.label}
                        <span style={{
                            marginLeft: '0.5rem',
                            background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-tertiary)',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Selection Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => selectAll(activeTab)}>
                        <CheckSquare size={16} /> Select All
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => deselectAll(activeTab)}>
                        <Square size={16} /> Deselect All
                    </button>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                    {currentSelection.size} selected
                </span>
            </div>

            {/* List */}
            <div className="card" style={{ maxHeight: '50vh', overflow: 'auto', marginBottom: '1.5rem' }}>
                {currentData.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No {activeTab} found
                    </div>
                ) : (
                    currentData.map(item => (
                        <div
                            key={item.id}
                            onClick={() => toggleSelection(item.id, activeTab)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--color-border)',
                                background: currentSelection.has(item.id) ? 'var(--color-accent-primary)10' : 'transparent',
                            }}
                        >
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                border: `2px solid ${currentSelection.has(item.id) ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                                background: currentSelection.has(item.id) ? 'var(--color-accent-primary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 14,
                            }}>
                                {currentSelection.has(item.id) && '✓'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {item.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {activeTab === 'locations'
                                        ? item.kind || 'Location'
                                        : `Qty: ${item.quantity || 1}${(item.quantity || 1) > 1 ? ` (${item.quantity} QR codes)` : ''}`
                                    }
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Generate Button */}
            <button
                className="btn btn-primary"
                onClick={generatePDF}
                disabled={currentSelection.size === 0}
                style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            >
                <Download size={20} />
                Generate PDF ({currentSelection.size} {activeTab === 'locations' ? 'locations' : 'items'})
            </button>
        </div>
    );
}

export default QRPrint;
