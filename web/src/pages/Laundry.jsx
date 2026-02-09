import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, RefreshCw, Shirt, AlertTriangle, CheckCircle } from 'lucide-react';
import { wardrobeApi } from '../services/api';

const cleanlinessColors = {
    clean: 'var(--color-success)',
    worn: 'var(--color-warning)',
    dirty: 'var(--color-danger)',
    washing: 'var(--color-accent-secondary)',
};

function ClothingCard({ item, onWash, onWear }) {
    const navigate = useNavigate();

    return (
        <div
            className="card"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                cursor: 'pointer',
            }}
            onClick={() => navigate(`/item/${item.id}`)}
        >
            <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: `${cleanlinessColors[item.cleanliness] || 'var(--color-text-muted)'}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
            }}>
                👕
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {item.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {item.clothing_category || 'Clothing'} • Worn {item.wear_count || 0}x
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                {item.cleanliness === 'worn' && (
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onWear(item.id)}
                        title="Rewear"
                    >
                        <Shirt size={16} /> Rewear
                    </button>
                )}
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onWash(item.id)}
                    title="Mark as washed"
                >
                    <Droplets size={16} /> Wash
                </button>
            </div>
        </div>
    );
}

function Laundry() {
    const [activeTab, setActiveTab] = useState('dirty');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const res = await wardrobeApi.getLaundryItems();
            setItems(res.data || []);
        } catch (error) {
            console.error('Failed to load laundry:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleWash = async (id) => {
        try {
            await wardrobeApi.washItem(id);
            loadData();
        } catch (error) {
            console.error('Failed to wash item:', error);
        }
    };

    const handleWear = async (id) => {
        try {
            await wardrobeApi.wearItem(id);
            loadData();
        } catch (error) {
            console.error('Failed to wear item:', error);
        }
    };

    const handleBulkWash = async () => {
        const toWash = filteredItems;
        if (toWash.length === 0) return;

        if (!confirm(`Wash all ${toWash.length} items?`)) return;

        try {
            await Promise.all(toWash.map(item => wardrobeApi.washItem(item.id)));
            loadData();
        } catch (error) {
            console.error('Failed to bulk wash:', error);
        }
    };

    const dirtyItems = items.filter(i => i.cleanliness === 'dirty');
    const wornItems = items.filter(i => i.cleanliness === 'worn');
    const rewearItems = wornItems.filter(i => (i.wear_count || 0) < (i.max_wears_before_wash || 3));

    const filteredItems = activeTab === 'dirty' ? dirtyItems
        : activeTab === 'worn' ? wornItems
            : rewearItems;

    const tabs = [
        { id: 'dirty', label: 'Dirty', icon: AlertTriangle, count: dirtyItems.length, color: 'var(--color-danger)' },
        { id: 'worn', label: 'Worn', icon: Shirt, count: wornItems.length, color: 'var(--color-warning)' },
        { id: 'rewear', label: 'Rewearable', icon: CheckCircle, count: rewearItems.length, color: 'var(--color-success)' },
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
                <h1 className="page-title">🧺 Laundry</h1>
                <button
                    className="btn btn-secondary"
                    onClick={() => { setRefreshing(true); loadData(); }}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        <span style={{
                            background: tab.color + '30',
                            color: tab.color,
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Bulk Actions */}
            {filteredItems.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleBulkWash}>
                        <Droplets size={18} />
                        Wash All ({filteredItems.length})
                    </button>
                </div>
            )}

            {/* Items List */}
            {filteredItems.length === 0 ? (
                <div className="empty-state">
                    <span style={{ fontSize: 48 }}>✨</span>
                    <h3>All clean!</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        No {activeTab} items in the laundry
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredItems.map(item => (
                        <ClothingCard
                            key={item.id}
                            item={item}
                            onWash={handleWash}
                            onWear={handleWear}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Laundry;
