import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shirt, Trash2, RefreshCw, X, CheckCircle, Sparkles, Calendar, Layers } from 'lucide-react';
import { wardrobeApi } from '../services/api';

const categoryLabels = {
    formal: 'Formal', casual: 'Casual', athletic: 'Athletic', lounge: 'Lounge',
    outerwear: 'Outerwear', essentials: 'Essentials', tshirt: 'T-Shirt', jeans: 'Jeans',
    pants: 'Pants', shorts: 'Shorts', dress: 'Dress', polo: 'Polo', other: 'Other'
};

function CreateOutfitModal({ isOpen, onClose, onSuccess, clothingItems }) {
    const [name, setName] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const toggleItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || selectedItems.length === 0) return;

        setLoading(true);
        try {
            await wardrobeApi.createOutfit({
                name: name.trim(),
                item_ids: selectedItems,
            });
            onSuccess();
            onClose();
            setName('');
            setSelectedItems([]);
        } catch (error) {
            console.error('Failed to create outfit:', error);
            alert('Failed to create outfit');
        } finally {
            setLoading(false);
        }
    };

    // Group items by category
    const groupedItems = clothingItems.reduce((acc, item) => {
        const cat = item.clothing_category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 600,
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                            ✨ Create New Outfit
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Combine clothes for a quick "wear outfit" action
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
                        {/* Name Input */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: 'var(--color-text-secondary)',
                                marginBottom: '0.5rem',
                            }}>
                                Outfit Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Work Monday, Casual Friday, Gym Day"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.15s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--color-accent-primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>

                        {/* Items Selection */}
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: 'var(--color-text-secondary)',
                                marginBottom: '0.75rem',
                            }}>
                                <span>Select Items</span>
                                <span style={{
                                    background: selectedItems.length > 0 ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                                    color: selectedItems.length > 0 ? '#fff' : 'var(--color-text-muted)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}>
                                    {selectedItems.length} selected
                                </span>
                            </label>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: 'var(--color-text-muted)',
                                            marginBottom: '0.5rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {categoryLabels[category] || category}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {items.map(item => {
                                                const isSelected = selectedItems.includes(item.id);
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => toggleItem(item.id)}
                                                        style={{
                                                            padding: '0.5rem 0.875rem',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: `2px solid ${isSelected ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                                                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-bg-tertiary)',
                                                            color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.375rem',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        {isSelected && <CheckCircle size={14} />}
                                                        {item.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.625rem 1.25rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim() || selectedItems.length === 0}
                            style={{
                                padding: '0.625rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: (!name.trim() || selectedItems.length === 0)
                                    ? 'var(--color-bg-tertiary)'
                                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: (!name.trim() || selectedItems.length === 0) ? 'var(--color-text-muted)' : '#fff',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: (!name.trim() || selectedItems.length === 0) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <Sparkles size={16} />
                            {loading ? 'Creating...' : 'Create Outfit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function OutfitCard({ outfit, onWear, onDelete }) {
    const navigate = useNavigate();
    const itemCount = outfit.items?.length || 0;
    const lastWorn = outfit.last_worn ? new Date(outfit.last_worn) : null;
    const daysSinceWorn = lastWorn ? Math.floor((Date.now() - lastWorn.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return (
        <div
            style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
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
            {/* Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            color: 'var(--color-text-primary)',
                            marginBottom: '0.375rem',
                        }}>
                            {outfit.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Layers size={14} />
                                {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={14} />
                                {daysSinceWorn !== null
                                    ? daysSinceWorn === 0 ? 'Worn today' : `${daysSinceWorn}d ago`
                                    : 'Never worn'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => onWear(outfit.id)}
                            style={{
                                padding: '0.5rem 0.875rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                            }}
                        >
                            <Shirt size={14} /> Wear
                        </button>
                        <button
                            onClick={() => onDelete(outfit.id)}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.borderColor = '#ef4444';
                                e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'var(--color-border)';
                                e.currentTarget.style.color = 'var(--color-text-muted)';
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {outfit.items?.map(item => (
                        <span
                            key={item.id}
                            style={{
                                background: 'var(--color-bg-tertiary)',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                                fontWeight: 500,
                            }}
                        >
                            👕 {item.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Outfits() {
    const [outfits, setOutfits] = useState([]);
    const [clothingItems, setClothingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const loadData = async () => {
        try {
            const [outfitsRes, clothingRes] = await Promise.all([
                wardrobeApi.listOutfits(),
                wardrobeApi.listClothing(),
            ]);
            setOutfits(outfitsRes.data || []);
            setClothingItems((clothingRes.data || []).filter(i => i.cleanliness === 'clean'));
        } catch (error) {
            console.error('Failed to load outfits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleWear = async (id) => {
        try {
            await wardrobeApi.wearOutfit(id);
            loadData();
            alert('Outfit worn! All items marked as worn.');
        } catch (error) {
            console.error('Failed to wear outfit:', error);
            alert('Failed to wear outfit');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this outfit?')) return;
        try {
            await wardrobeApi.deleteOutfit(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete outfit:', error);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw size={40} className="spinning" style={{ color: 'var(--color-accent-primary)', marginBottom: '1rem' }} />
                    <div style={{ color: 'var(--color-text-muted)' }}>Loading outfits...</div>
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
                        <span style={{ fontSize: '2.5rem' }}>👔</span>
                        Outfit Combos
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Create outfit presets to quickly log what you wear
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                        padding: '0.625rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                    }}
                >
                    <Plus size={18} />
                    New Outfit
                </button>
            </div>

            {/* Stats Bar */}
            {outfits.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    padding: '1rem 1.5rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    marginBottom: '1.5rem',
                }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                            {outfits.length}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Saved Outfits</div>
                    </div>
                    <div style={{ width: 1, background: 'var(--color-border)' }} />
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {clothingItems.length}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Clean Items</div>
                    </div>
                </div>
            )}

            {/* Outfits Grid */}
            {outfits.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                }}>
                    <div style={{ fontSize: 72, marginBottom: '1rem' }}>👔</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                        No outfits yet
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: 350, margin: '0 auto 1.5rem' }}>
                        Create outfit combos to quickly log what you wear each day
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={18} />
                        Create Your First Outfit
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                    gap: '1rem'
                }}>
                    {outfits.map(outfit => (
                        <OutfitCard
                            key={outfit.id}
                            outfit={outfit}
                            onWear={handleWear}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <CreateOutfitModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={loadData}
                clothingItems={clothingItems}
            />
        </div>
    );
}

export default Outfits;
