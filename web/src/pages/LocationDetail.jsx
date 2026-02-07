import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Box,
    Package,
    ChevronRight,
    Plus,
    QrCode,
    Edit2,
    Trash2,
    FolderPlus,
    Layout,
    Briefcase,
    X,
    Tag
} from 'lucide-react';
import { locationApi, itemApi, qrApi } from '../services/api';

const kindIcons = {
    room: Layout,
    furniture: Box,
    container: Box,
    surface: Layout,
    portable: Briefcase,
};

const kindLabels = {
    room: 'Room',
    furniture: 'Furniture',
    container: 'Container',
    surface: 'Surface',
    portable: 'Portable',
};

function AddItemModal({ locationId, onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isTemporary, setIsTemporary] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await itemApi.create({
                name,
                quantity,
                current_location_id: locationId,
                is_temporary_placement: isTemporary,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create item:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Item</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Item Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Winter Jacket, Passport, Charger"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input
                                type="number"
                                className="input"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={isTemporary}
                                    onChange={e => setIsTemporary(e.target.checked)}
                                />
                                <span className="form-label" style={{ margin: 0 }}>
                                    This is a temporary placement
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Valid child kinds based on parent kind (matching backend validation)
const VALID_CHILD_KINDS = {
    room: ['furniture', 'container', 'surface', 'portable', 'laundry_worn', 'laundry_dirty'],
    furniture: ['container', 'surface'],
    container: ['container'],
    surface: ['container', 'portable'],
    portable: ['container'],
    laundry_worn: [],
    laundry_dirty: [],
};

const KIND_DETAILS = {
    furniture: { icon: Box, label: 'Furniture', description: 'Wardrobe, Desk, Shelf', color: '#8b5cf6' },
    container: { icon: Package, label: 'Container', description: 'Box, Drawer, Bin', color: '#06b6d4' },
    surface: { icon: Layout, label: 'Surface', description: 'Shelf, Counter', color: '#10b981' },
    portable: { icon: Briefcase, label: 'Portable', description: 'Bag, Suitcase', color: '#f59e0b' },
    laundry_worn: { icon: Package, label: 'Worn Basket', description: 'Rewearable clothes', color: '#10b981' },
    laundry_dirty: { icon: Package, label: 'Dirty Basket', description: 'Needs washing', color: '#ef4444' },
};

function AddSubLocationModal({ parentId, parentKind, onClose, onSuccess }) {
    const validKinds = VALID_CHILD_KINDS[parentKind] || ['container'];
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [kind, setKind] = useState(validKinds[0] || 'container');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step === 1 && validKinds.length > 1) {
            setStep(2);
            return;
        }

        setLoading(true);
        try {
            await locationApi.create({
                name,
                kind,
                parent_id: parentId,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create sub-location:', error);
            alert(error.response?.data?.detail || 'Failed to create sub-location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {step === 1 ? '📍 Add Sub-Location' : '📦 Choose Type'}
                    </h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {step === 1 ? (
                            <div className="form-group">
                                <label className="form-label">What's inside this location?</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Top Drawer, Left Shelf, Main Compartment"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    autoFocus
                                    style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--space-md)' }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                {validKinds.map(k => {
                                    const details = KIND_DETAILS[k];
                                    if (!details) return null;
                                    const IconComponent = details.icon;
                                    return (
                                        <div
                                            key={k}
                                            onClick={() => setKind(k)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-md)',
                                                padding: 'var(--space-md)',
                                                borderRadius: 'var(--radius-md)',
                                                border: kind === k
                                                    ? `2px solid ${details.color}`
                                                    : '2px solid var(--color-border)',
                                                background: kind === k
                                                    ? `${details.color}15`
                                                    : 'var(--color-bg-tertiary)',
                                                cursor: 'pointer',
                                                transition: 'all var(--transition-fast)',
                                            }}
                                        >
                                            <div style={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 'var(--radius-md)',
                                                background: `${details.color}25`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <IconComponent size={20} style={{ color: details.color }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{details.label}</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                    {details.description}
                                                </div>
                                            </div>
                                            {kind === k && (
                                                <div style={{ marginLeft: 'auto', color: details.color, fontWeight: 'bold' }}>✓</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {step === 2 && (
                            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                                ← Back
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                            {loading ? 'Creating...' : (step === 1 && validKinds.length > 1) ? 'Next →' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function QRCodeModal({ location, onClose }) {
    const qrUrl = qrApi.getQrUrl(location.id, 300);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                <div className="modal-header">
                    <h2 className="modal-title">QR Code for {location.name}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <img
                        src={qrUrl}
                        alt={`QR Code for ${location.name}`}
                        style={{
                            maxWidth: '100%',
                            borderRadius: 'var(--radius-md)',
                            background: 'white',
                            padding: 'var(--space-md)'
                        }}
                    />
                    <p style={{ marginTop: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
                        Scan this code to quickly access this location
                    </p>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <a
                        href={qrUrl}
                        download={`qr-${location.name}.png`}
                        className="btn btn-primary"
                    >
                        Download QR Code
                    </a>
                </div>
            </div>
        </div>
    );
}

function LocationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [location, setLocation] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showAddSub, setShowAddSub] = useState(false);
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        loadLocation();
    }, [id]);

    const loadLocation = async () => {
        setLoading(true);
        try {
            const locationRes = await locationApi.get(id);
            setLocation(locationRes.data);

            const itemsRes = await itemApi.list({ location_id: id });
            setItems(itemsRes.data);
        } catch (error) {
            console.error('Failed to load location:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this location? All items and sub-locations will be removed.')) {
            return;
        }
        try {
            await locationApi.delete(id);
            navigate('/');
            window.location.reload();
        } catch (error) {
            console.error('Failed to delete location:', error);
        }
    };

    if (loading) {
        return <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>;
    }

    if (!location) {
        return <div>Location not found</div>;
    }

    const Icon = kindIcons[location.kind] || Box;

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="breadcrumb">
                <Link to="/" className="breadcrumb-item">Home</Link>
                {location.path?.slice(0, -1).map((segment, index) => (
                    <span key={segment.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <ChevronRight size={14} className="breadcrumb-separator" />
                        <Link to={`/location/${segment.id}`} className="breadcrumb-item">
                            {segment.name}
                        </Link>
                    </span>
                ))}
                <ChevronRight size={14} className="breadcrumb-separator" />
                <span className="breadcrumb-item current">{location.name}</span>
            </nav>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                        <Icon size={32} style={{ color: 'var(--color-accent-primary)' }} />
                        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                            {location.name}
                        </h1>
                        <span className="badge badge-primary">{kindLabels[location.kind]}</span>
                    </div>
                    {location.aliases?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                            <Tag size={14} style={{ color: 'var(--color-text-muted)' }} />
                            {location.aliases.map(alias => (
                                <span key={alias} className="badge badge-success">{alias}</span>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => setShowQR(true)}>
                        <QrCode size={18} />
                    </button>
                    <button className="btn btn-secondary btn-icon" onClick={handleDelete}>
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <button className="btn btn-primary" onClick={() => setShowAddItem(true)}>
                    <Plus size={16} />
                    Add Item
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAddSub(true)}>
                    <FolderPlus size={16} />
                    Add Sub-Location
                </button>
            </div>

            <div className="grid grid-2">
                {/* Sub-Locations */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Sub-Locations ({location.children?.length || 0})</h3>
                    </div>
                    {location.children?.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>No sub-locations</p>
                        </div>
                    ) : (
                        <div className="item-list">
                            {location.children?.map(child => {
                                const ChildIcon = kindIcons[child.kind] || Box;
                                return (
                                    <div
                                        key={child.id}
                                        className="item-row"
                                        onClick={() => navigate(`/location/${child.id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="item-info">
                                            <ChildIcon size={18} style={{ color: 'var(--color-accent-primary)' }} />
                                            <div>
                                                <div className="item-name">{child.name}</div>
                                                <div className="item-location">
                                                    {child.item_count} items • {child.children_count} sub-locations
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Items */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Items ({items.length})</h3>
                    </div>
                    {items.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>No items in this location</p>
                        </div>
                    ) : (
                        <div className="item-list">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    className="item-row"
                                    onClick={() => navigate(`/item/${item.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="item-info">
                                        <Package size={18} />
                                        <div>
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-location">
                                                Qty: {item.quantity}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {item.is_temporary_placement && (
                                            <span className="badge badge-warning">Temporary</span>
                                        )}
                                        <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddItem && (
                <AddItemModal
                    locationId={id}
                    onClose={() => setShowAddItem(false)}
                    onSuccess={loadLocation}
                />
            )}

            {showAddSub && (
                <AddSubLocationModal
                    parentId={id}
                    parentKind={location?.kind}
                    onClose={() => setShowAddSub(false)}
                    onSuccess={() => {
                        loadLocation();
                        window.location.reload();
                    }}
                />
            )}

            {showQR && (
                <QRCodeModal
                    location={location}
                    onClose={() => setShowQR(false)}
                />
            )}
        </div>
    );
}

export default LocationDetail;
