import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, RefreshCw, Shirt, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { wardrobeApi } from '../services/api';

const cleanlinessConfig = {
    clean: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Clean' },
    worn: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Worn' },
    dirty: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'Dirty' },
    washing: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', label: 'Washing' },
};

const categoryEmojis = {
    tshirt: '👕', polo: '👔', dress_shirt: '👔', blazer: '🧥', jacket: '🧥',
    coat: '🧥', sweater: '🧶', hoodie: '🧥', jeans: '👖', pants: '👖',
    shorts: '🩳', dress: '👗', skirt: '👗', underwear: '🩲', socks: '🧦',
    default: '👕'
};

function ClothingCard({ item, onWash, onWear }) {
    const navigate = useNavigate();
    const config = cleanlinessConfig[item.cleanliness] || cleanlinessConfig.clean;
    const emoji = categoryEmojis[item.clothing_category] || categoryEmojis.default;

    return (
        <div
            className="clothing-card"
            onClick={() => navigate(`/item/${item.id}`)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
        >
            {/* Icon */}
            <div style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                background: config.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
            }}>
                {emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    fontSize: '1rem',
                    marginBottom: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {item.name}
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)'
                }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '999px',
                        background: config.bg,
                        color: config.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                    }}>
                        {config.label}
                    </span>
                    <span>Worn {item.wear_count || 0}× this cycle</span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {item.cleanliness === 'worn' && (
                    <button
                        className="btn btn-ghost"
                        onClick={() => onWear(item.id)}
                        title="Wear again"
                        style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <Shirt size={14} /> Rewear
                    </button>
                )}
                <button
                    onClick={() => onWash(item.id)}
                    title="Mark as washed"
                    style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                    }}
                >
                    <Droplets size={14} /> Wash
                </button>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, count, label, color, active, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                flex: 1,
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                background: active ? `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)` : 'var(--color-bg-secondary)',
                border: `2px solid ${active ? color : 'var(--color-border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
            }}
            onMouseEnter={e => {
                if (!active) {
                    e.currentTarget.style.borderColor = color;
                    e.currentTarget.style.background = `${color}10`;
                }
            }}
            onMouseLeave={e => {
                if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-bg-secondary)';
                }
            }}
        >
            <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
            }}>
                <Icon size={24} style={{ color }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: active ? color : 'var(--color-text-primary)' }}>
                {count}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                {label}
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

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw size={40} className="spinning" style={{ color: 'var(--color-accent-primary)', marginBottom: '1rem' }} />
                    <div style={{ color: 'var(--color-text-muted)' }}>Loading laundry...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '2rem',
            }}>
                <div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.5rem',
                    }}>
                        <span style={{ fontSize: '2.5rem' }}>🧺</span>
                        Laundry Tracker
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Track what needs washing and what's ready to wear again
                    </p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); loadData(); }}
                    disabled={refreshing}
                    style={{
                        padding: '0.625rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard
                    icon={AlertTriangle}
                    count={dirtyItems.length}
                    label="Dirty"
                    color="#ef4444"
                    active={activeTab === 'dirty'}
                    onClick={() => setActiveTab('dirty')}
                />
                <StatCard
                    icon={Shirt}
                    count={wornItems.length}
                    label="Worn"
                    color="#f59e0b"
                    active={activeTab === 'worn'}
                    onClick={() => setActiveTab('worn')}
                />
                <StatCard
                    icon={CheckCircle}
                    count={rewearItems.length}
                    label="Rewearable"
                    color="#10b981"
                    active={activeTab === 'rewear'}
                    onClick={() => setActiveTab('rewear')}
                />
            </div>

            {/* Action Bar */}
            {filteredItems.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in this category
                    </span>
                    <button
                        onClick={handleBulkWash}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Sparkles size={16} />
                        Wash All ({filteredItems.length})
                    </button>
                </div>
            )}

            {/* Items List */}
            {filteredItems.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                }}>
                    <div style={{ fontSize: 64, marginBottom: '1rem' }}>✨</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                        All clean!
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: 300, margin: '0 auto' }}>
                        No {activeTab === 'dirty' ? 'dirty' : activeTab === 'worn' ? 'worn' : 'rewearable'} items right now
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
