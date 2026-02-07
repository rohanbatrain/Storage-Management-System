import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Package,
    ChevronRight,
    MapPin,
    Home,
    ArrowRight,
    Clock,
    Trash2,
    Edit2,
    RotateCcw,
    X
} from 'lucide-react';
import { itemApi, locationApi } from '../services/api';

function MoveItemModal({ item, onClose, onSuccess }) {
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [isTemporary, setIsTemporary] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const res = await locationApi.getTree();
            // Flatten tree for selection
            const flattenTree = (nodes, path = '') => {
                let result = [];
                for (const node of nodes) {
                    const fullPath = path ? `${path} → ${node.name}` : node.name;
                    result.push({ id: node.id, path: fullPath });
                    if (node.children) {
                        result = result.concat(flattenTree(node.children, fullPath));
                    }
                }
                return result;
            };
            setLocations(flattenTree(res.data));
        } catch (error) {
            console.error('Failed to load locations:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await itemApi.move(item.id, {
                to_location_id: selectedLocation,
                is_temporary: isTemporary,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to move item:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Move Item</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Move "{item.name}" to:</label>
                            <select
                                className="form-select"
                                value={selectedLocation}
                                onChange={e => setSelectedLocation(e.target.value)}
                                required
                            >
                                <option value="">Select a location...</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.path}</option>
                                ))}
                            </select>
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
                        <button type="submit" className="btn btn-primary" disabled={loading || !selectedLocation}>
                            {loading ? 'Moving...' : 'Move Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMoveModal, setShowMoveModal] = useState(false);

    useEffect(() => {
        loadItem();
    }, [id]);

    const loadItem = async () => {
        setLoading(true);
        try {
            const itemRes = await itemApi.get(id);
            setItem(itemRes.data);

            const historyRes = await itemApi.getHistory(id);
            setHistory(historyRes.data);
        } catch (error) {
            console.error('Failed to load item:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReturn = async () => {
        try {
            await itemApi.return(id);
            loadItem();
        } catch (error) {
            console.error('Failed to return item:', error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }
        try {
            await itemApi.delete(id);
            navigate(-1);
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    if (loading) {
        return <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>;
    }

    if (!item) {
        return <div>Item not found</div>;
    }

    const actionLabels = {
        placed: 'Placed',
        moved: 'Moved',
        returned: 'Returned',
    };

    const actionColors = {
        placed: 'var(--color-success)',
        moved: 'var(--color-info)',
        returned: 'var(--color-accent-primary)',
    };

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="breadcrumb">
                <Link to="/" className="breadcrumb-item">Home</Link>
                {item.location_path?.map((segment, index) => (
                    <span key={segment.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <ChevronRight size={14} className="breadcrumb-separator" />
                        <Link to={`/location/${segment.id}`} className="breadcrumb-item">
                            {segment.name}
                        </Link>
                    </span>
                ))}
                <ChevronRight size={14} className="breadcrumb-separator" />
                <span className="breadcrumb-item current">{item.name}</span>
            </nav>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                        <Package size={32} style={{ color: 'var(--color-accent-primary)' }} />
                        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                            {item.name}
                        </h1>
                        {item.is_temporary_placement && (
                            <span className="badge badge-warning">Temporary</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
                        <span>Quantity: {item.quantity}</span>
                        {item.tags?.length > 0 && (
                            <span>Tags: {item.tags.join(', ')}</span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-icon" onClick={handleDelete}>
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Location Cards */}
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                        <MapPin size={18} style={{ color: 'var(--color-info)' }} />
                        <h3 className="card-title">Current Location</h3>
                    </div>
                    <Link
                        to={`/location/${item.current_location_id}`}
                        style={{
                            display: 'block',
                            padding: 'var(--space-md)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            color: 'inherit'
                        }}
                    >
                        <div style={{ fontWeight: 500 }}>{item.current_location?.name}</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            {item.location_path?.map(p => p.name).join(' → ')}
                        </div>
                    </Link>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                        <Home size={18} style={{ color: 'var(--color-success)' }} />
                        <h3 className="card-title">Permanent Home</h3>
                    </div>
                    {item.permanent_location ? (
                        <Link
                            to={`/location/${item.permanent_location_id}`}
                            style={{
                                display: 'block',
                                padding: 'var(--space-md)',
                                background: 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                color: 'inherit'
                            }}
                        >
                            <div style={{ fontWeight: 500 }}>{item.permanent_location?.name}</div>
                        </Link>
                    ) : (
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-muted)'
                        }}>
                            No permanent location set
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <button className="btn btn-primary" onClick={() => setShowMoveModal(true)}>
                    <ArrowRight size={16} />
                    Move to...
                </button>
                {item.is_temporary_placement && item.permanent_location_id && (
                    <button className="btn btn-secondary" onClick={handleReturn}>
                        <RotateCcw size={16} />
                        Return to Home
                    </button>
                )}
            </div>

            {/* Movement History */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Clock size={18} />
                        Movement History
                    </h3>
                </div>
                {history.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                        <p style={{ color: 'var(--color-text-muted)' }}>No movement history</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {history.map((record, index) => (
                            <div
                                key={record.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 'var(--space-md)',
                                    padding: 'var(--space-md)',
                                    background: 'var(--color-bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: actionColors[record.action],
                                        marginTop: 6,
                                        flexShrink: 0
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                                        <span style={{ fontWeight: 500, color: actionColors[record.action] }}>
                                            {actionLabels[record.action]}
                                        </span>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                            {new Date(record.moved_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        {record.from_location ? (
                                            <>
                                                From <strong>{record.from_location.name}</strong> to <strong>{record.to_location.name}</strong>
                                            </>
                                        ) : (
                                            <>
                                                Initial placement in <strong>{record.to_location.name}</strong>
                                            </>
                                        )}
                                    </div>
                                    {record.notes && (
                                        <div style={{ marginTop: 'var(--space-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                            "{record.notes}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Move Modal */}
            {showMoveModal && (
                <MoveItemModal
                    item={item}
                    onClose={() => setShowMoveModal(false)}
                    onSuccess={loadItem}
                />
            )}
        </div>
    );
}

export default ItemDetail;
