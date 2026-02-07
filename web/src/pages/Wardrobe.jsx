import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shirt,
    Droplets,
    CheckCircle,
    AlertTriangle,
    Plus,
    RefreshCw,
    Layers,
    BarChart3,
    ChevronRight
} from 'lucide-react';
import { wardrobeApi, locationApi } from '../services/api';

const categoryLabels = {
    shirt: 'Shirt',
    tshirt: 'T-Shirt',
    pants: 'Pants',
    jeans: 'Jeans',
    shorts: 'Shorts',
    dress: 'Dress',
    skirt: 'Skirt',
    jacket: 'Jacket',
    sweater: 'Sweater',
    hoodie: 'Hoodie',
    coat: 'Coat',
    underwear: 'Underwear',
    socks: 'Socks',
    shoes: 'Shoes',
    accessories: 'Accessories',
    other: 'Other',
};

const cleanlinessColors = {
    clean: 'var(--color-success)',
    worn: 'var(--color-warning)',
    dirty: 'var(--color-danger)',
    washing: 'var(--color-accent-secondary)',
};

const cleanlinessLabels = {
    clean: 'Clean',
    worn: 'Worn',
    dirty: 'Dirty',
    washing: 'In Wash',
};

function ClothingCard({ item, onWear, onWash, onLaundry }) {
    return (
        <div className="card" style={{ padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{item.name}</h4>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        {categoryLabels[item.category] || item.category}
                    </span>
                </div>
                <span
                    className="badge"
                    style={{
                        backgroundColor: cleanlinessColors[item.cleanliness] + '20',
                        color: cleanlinessColors[item.cleanliness],
                    }}
                >
                    {cleanlinessLabels[item.cleanliness]}
                </span>
            </div>

            <div style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                <div>
                    Wear count: {item.wear_count_since_wash} / {item.max_wears_before_wash}
                </div>
                {item.color && <div>Color: {item.color}</div>}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {item.can_rewear && (
                    <button
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--space-xs) var(--space-sm)' }}
                        onClick={() => onWear(item.id)}
                    >
                        <Shirt size={14} />
                        Wear
                    </button>
                )}
                {item.cleanliness === 'dirty' && (
                    <button
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--space-xs) var(--space-sm)' }}
                        onClick={() => onLaundry(item.id)}
                    >
                        <Droplets size={14} />
                        To Laundry
                    </button>
                )}
                {(item.cleanliness === 'washing' || item.cleanliness === 'dirty') && (
                    <button
                        className="btn btn-ghost"
                        style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--space-xs) var(--space-sm)' }}
                        onClick={() => onWash(item.id)}
                    >
                        <RefreshCw size={14} />
                        Wash
                    </button>
                )}
            </div>
        </div>
    );
}

function AddClothingModal({ isOpen, onClose, onAdd, locations }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('tshirt');
    const [color, setColor] = useState('');
    const [locationId, setLocationId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (locations.length > 0 && !locationId) {
            setLocationId(locations[0].id);
        }
    }, [locations, locationId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !locationId) return;

        setLoading(true);
        try {
            await onAdd({
                name: name.trim(),
                current_location_id: locationId,
                clothing: {
                    category,
                    color: color || null,
                    season: 'all',
                },
            });
            setName('');
            setColor('');
            onClose();
        } catch (err) {
            console.error('Failed to create clothing:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Clothing</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label">Name *</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Blue Polo Shirt"
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Category</label>
                        <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Color</label>
                        <input
                            type="text"
                            className="input"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            placeholder="Blue"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Closet/Location</label>
                        <select className="input" value={locationId} onChange={e => setLocationId(e.target.value)}>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                            {loading ? 'Adding...' : 'Add Clothing'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Wardrobe() {
    const navigate = useNavigate();
    const [clothes, setClothes] = useState([]);
    const [outfits, setOutfits] = useState([]);
    const [stats, setStats] = useState(null);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [clothesRes, outfitsRes, statsRes, locationsRes] = await Promise.all([
                wardrobeApi.listClothing(),
                wardrobeApi.listOutfits(),
                wardrobeApi.getStats(),
                locationApi.list(),
            ]);
            setClothes(clothesRes.data);
            setOutfits(outfitsRes.data);
            setStats(statsRes.data);
            setLocations(locationsRes.data);
        } catch (err) {
            console.error('Failed to load wardrobe data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWear = async (itemId) => {
        try {
            await wardrobeApi.wearItem(itemId);
            loadData();
        } catch (err) {
            console.error('Failed to wear item:', err);
            alert(err.response?.data?.detail || 'Failed to wear item');
        }
    };

    const handleWash = async (itemId) => {
        try {
            await wardrobeApi.washItem(itemId);
            loadData();
        } catch (err) {
            console.error('Failed to wash item:', err);
        }
    };

    const handleLaundry = async (itemId) => {
        try {
            await wardrobeApi.moveToLaundry(itemId);
            loadData();
        } catch (err) {
            console.error('Failed to move to laundry:', err);
            alert(err.response?.data?.detail || 'Failed to move to laundry');
        }
    };

    const handleAddClothing = async (data) => {
        await wardrobeApi.createClothingItem(data);
        loadData();
    };

    const filteredClothes = clothes.filter(item => {
        if (activeTab === 'all') return true;
        if (activeTab === 'clean') return item.cleanliness === 'clean';
        if (activeTab === 'worn') return item.cleanliness === 'worn';
        if (activeTab === 'laundry') return item.cleanliness === 'dirty' || item.cleanliness === 'washing';
        return true;
    });

    if (loading) {
        return (
            <div style={{ padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                Loading wardrobe...
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                    👕 Wardrobe
                </h1>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} />
                    Add Clothing
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                            {stats.total_clothing_items}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Total Items</div>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                            {stats.clean_items}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Clean</div>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-warning)' }}>
                            {stats.worn_items}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Worn</div>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-danger)' }}>
                            {stats.dirty_items + stats.in_laundry}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Laundry</div>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-accent-secondary)' }}>
                            {stats.total_outfits}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Outfits</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
                {[
                    { key: 'all', label: 'All', icon: Layers },
                    { key: 'clean', label: 'Clean', icon: CheckCircle },
                    { key: 'worn', label: 'Worn', icon: AlertTriangle },
                    { key: 'laundry', label: 'Laundry', icon: Droplets },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab(tab.key)}
                        style={{ borderRadius: '0', borderBottom: activeTab === tab.key ? '2px solid var(--color-accent-primary)' : '2px solid transparent' }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Clothing Grid */}
            {filteredClothes.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
                    {filteredClothes.map(item => (
                        <ClothingCard
                            key={item.id}
                            item={item}
                            onWear={handleWear}
                            onWash={handleWash}
                            onLaundry={handleLaundry}
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <Shirt size={48} className="empty-state-icon" />
                    <h3 className="empty-state-title">
                        {activeTab === 'laundry' ? 'No items need washing' : 'No clothing items'}
                    </h3>
                    <p className="empty-state-text">
                        {activeTab === 'all' ? 'Add some clothing to get started' : 'No items in this category'}
                    </p>
                    {activeTab === 'all' && (
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            <Plus size={18} />
                            Add Clothing
                        </button>
                    )}
                </div>
            )}

            {/* Outfits Section */}
            {outfits.length > 0 && (
                <div style={{ marginTop: 'var(--space-2xl)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
                        Saved Outfits
                    </h2>
                    <div className="card">
                        <div className="item-list">
                            {outfits.map(outfit => (
                                <div key={outfit.id} className="item-row">
                                    <div className="item-info">
                                        <Layers size={18} />
                                        <div>
                                            <div className="item-name">{outfit.name}</div>
                                            <div className="item-location">
                                                {outfit.item_ids?.length || 0} items • Worn {outfit.wear_count} times
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <AddClothingModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddClothing}
                locations={locations}
            />
        </div>
    );
}

export default Wardrobe;
