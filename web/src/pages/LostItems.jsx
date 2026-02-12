import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Package, Clock, Search } from 'lucide-react';
import { itemApi } from '../services/api';

function LostItems() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLostItems();
    }, []);

    const loadLostItems = async () => {
        setLoading(true);
        try {
            const res = await itemApi.listLost();
            setItems(res.data);
        } catch (error) {
            console.error('Failed to load lost items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkFound = async (itemId) => {
        try {
            await itemApi.markFound(itemId);
            loadLostItems();
        } catch (error) {
            console.error('Failed to mark item found:', error);
        }
    };

    const now = new Date();

    const getDaysLost = (item) => {
        if (!item.lost_at) return '';
        const days = Math.floor((now - new Date(item.lost_at)) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    if (loading) {
        return <div style={{ color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>Loading lost items...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <AlertTriangle size={32} style={{ color: '#EF4444' }} />
                        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>Lost Items</h1>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                        Items marked as lost or missing
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card" style={{ textAlign: 'center', border: '2px solid #EF4444' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{items.length}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Items Lost</div>
                </div>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: 48, marginBottom: 'var(--space-md)' }}>🎉</div>
                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>
                        No lost items!
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Everything is accounted for.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-lg)',
                                padding: 'var(--space-lg)',
                                borderLeft: `4px solid #EF4444`,
                                transition: 'transform 0.15s',
                            }}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                                background: '#EF444420',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 24, flexShrink: 0,
                            }}>
                                ⚠️
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Link to={`/item/${item.id}`} style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                                    {item.name}
                                </Link>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 4, flexWrap: 'wrap' }}>
                                    <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        Lost {getDaysLost(item)}
                                    </span>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                        {new Date(item.lost_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {item.lost_notes && (
                                    <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                        "{item.lost_notes}"
                                    </div>
                                )}
                            </div>

                            <button
                                className="btn"
                                style={{
                                    background: '#EF4444',
                                    color: '#fff', border: 'none', fontWeight: 600, flexShrink: 0,
                                }}
                                onClick={() => handleMarkFound(item.id)}
                            >
                                <RotateCcw size={14} />
                                Found
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LostItems;
