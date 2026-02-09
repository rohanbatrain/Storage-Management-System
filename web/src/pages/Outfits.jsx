import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shirt, Trash2, RefreshCw, X, CheckCircle } from 'lucide-react';
import { wardrobeApi } from '../services/api';

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
                <div className="modal-header">
                    <h2 className="modal-title">👔 Create Outfit</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Outfit Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Work Monday, Casual Weekend"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Select Items ({selectedItems.length} selected)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 300, overflow: 'auto' }}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                            {category}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {items.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={`btn ${selectedItems.includes(item.id) ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => toggleItem(item.id)}
                                                    style={{ fontSize: '0.875rem' }}
                                                >
                                                    {selectedItems.includes(item.id) && <CheckCircle size={14} />}
                                                    {item.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !name.trim() || selectedItems.length === 0}
                        >
                            {loading ? 'Creating...' : 'Create Outfit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function OutfitCard({ outfit, onWear, onDelete }) {
    return (
        <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {outfit.name}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        {outfit.items?.length || 0} items • Last worn {outfit.last_worn ? new Date(outfit.last_worn).toLocaleDateString() : 'never'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => onWear(outfit.id)}>
                        <Shirt size={16} /> Wear
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(outfit.id)} style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {outfit.items?.map(item => (
                    <span
                        key={item.id}
                        style={{
                            background: 'var(--color-bg-tertiary)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        {item.name}
                    </span>
                ))}
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
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <RefreshCw size={32} className="spinning" style={{ color: 'var(--color-text-muted)' }} />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">👔 Outfits</h1>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    Create Outfit
                </button>
            </div>

            {outfits.length === 0 ? (
                <div className="empty-state">
                    <span style={{ fontSize: 48 }}>👔</span>
                    <h3>No outfits yet</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Create outfit combos to quickly log what you wear
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        Create Your First Outfit
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
