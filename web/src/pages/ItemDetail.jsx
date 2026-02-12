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
    X,
    QrCode,
    Handshake,
    AlertTriangle
} from 'lucide-react';
import { itemApi, locationApi, qrApi, imageApi } from '../services/api';

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
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showLendModal, setShowLendModal] = useState(false);
    const [lendBorrower, setLendBorrower] = useState('');
    const [lendDueDate, setLendDueDate] = useState('');
    const [lendNotes, setLendNotes] = useState('');
    const [lendLoading, setLendLoading] = useState(false);
    const [showLostModal, setShowLostModal] = useState(false);
    const [lostNotes, setLostNotes] = useState('');
    const [lostLoading, setLostLoading] = useState(false);

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

    const handleLend = async (e) => {
        e.preventDefault();
        if (!lendBorrower.trim()) return;
        try {
            setLendLoading(true);
            await itemApi.lend(id, lendBorrower.trim(), lendDueDate || undefined, lendNotes || undefined);
            setShowLendModal(false);
            setLendBorrower('');
            setLendDueDate('');
            setLendNotes('');
            loadItem();
        } catch (error) {
            console.error('Failed to lend item:', error);
            alert(error.response?.data?.detail || 'Failed to lend item');
        } finally {
            setLendLoading(false);
        }
    };

    const handleReturnLoan = async () => {
        try {
            await itemApi.returnLoan(id);
            loadItem();
        } catch (error) {
            console.error('Failed to return loan:', error);
        }
    };

    const handleMarkLost = async (e) => {
        e.preventDefault();
        try {
            setLostLoading(true);
            await itemApi.markLost(id, lostNotes || undefined);
            setShowLostModal(false);
            setLostNotes('');
            loadItem();
        } catch (error) {
            console.error('Failed to mark item lost:', error);
            alert(error.response?.data?.detail || 'Failed to mark item lost');
        } finally {
            setLostLoading(false);
        }
    };

    const handleMarkFound = async () => {
        try {
            await itemApi.markFound(id);
            loadItem();
        } catch (error) {
            console.error('Failed to mark item found:', error);
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
        lent: 'Lent',
        returned_from_loan: 'Returned from Loan',
        lost: 'Lost',
        found: 'Found',
        worn: 'Worn',
        washed: 'Washed',
    };

    const actionColors = {
        placed: 'var(--color-success)',
        moved: 'var(--color-info)',
        returned: 'var(--color-accent-primary)',
        lent: '#8B5CF6',
        returned_from_loan: '#8B5CF6',
        lost: '#EF4444',
        found: 'var(--color-success)',
        worn: 'var(--color-warning)',
        washed: 'var(--color-info)',
    };

    const isOverdue = item?.is_lent && item?.due_date && new Date(item.due_date) < new Date();

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
                        {item.is_lent && (
                            <span className="badge" style={{ background: '#8B5CF620', color: '#8B5CF6', border: '1px solid #8B5CF640' }}>🤝 Lent</span>
                        )}
                        {item.is_lost && (
                            <span className="badge" style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}>⚠️ Lost</span>
                        )}
                    </div>
                    {item.image_url && (
                        <div style={{
                            marginBottom: 'var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            height: 200,
                            maxWidth: 300,
                            background: 'var(--color-bg-tertiary)',
                        }}>
                            <img
                                src={item.image_url}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
                        <span>Quantity: {item.quantity}</span>
                        {item.tags?.length > 0 && (
                            <span>Tags: {item.tags.join(', ')}</span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => setShowEditModal(true)}>
                        <Edit2 size={18} />
                    </button>
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

            {/* Loan Status Banner */}
            {item.is_lent && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-lg)',
                    background: isOverdue ? '#EF444420' : '#8B5CF620',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-xl)',
                    border: `1px solid ${isOverdue ? '#EF444440' : '#8B5CF640'}`,
                }}>
                    <div style={{ fontSize: 28 }}>{isOverdue ? '⚠️' : '🤝'}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: isOverdue ? '#EF4444' : '#8B5CF6', fontSize: 16 }}>
                            {isOverdue ? 'Overdue — ' : ''}Lent to {item.lent_to}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 4, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                            {item.lent_at && <span>Since {new Date(item.lent_at).toLocaleDateString()}</span>}
                            {item.due_date && <span>Due {new Date(item.due_date).toLocaleDateString()}</span>}
                        </div>
                        {item.lent_notes && (
                            <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                "{item.lent_notes}"
                            </div>
                        )}
                    </div>
                    <button
                        className="btn"
                        style={{ background: isOverdue ? '#EF4444' : '#8B5CF6', color: '#fff', border: 'none', fontWeight: 600 }}
                        onClick={handleReturnLoan}
                    >
                        <RotateCcw size={16} />
                        Mark Returned
                    </button>
                </div>
            )}



            {/* Lost Status Banner */}
            {
                item.is_lost && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-lg)',
                        background: '#EF444420',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-xl)',
                        border: '1px solid #EF444440',
                    }}>
                        <div style={{ fontSize: 28 }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 16 }}>
                                Item Marked as Lost
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 4, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                {item.lost_at && <span>Reported {new Date(item.lost_at).toLocaleDateString()}</span>}
                            </div>
                            {item.lost_notes && (
                                <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    "{item.lost_notes}"
                                </div>
                            )}
                        </div>
                        <button
                            className="btn"
                            style={{ background: '#EF4444', color: '#fff', border: 'none', fontWeight: 600 }}
                            onClick={handleMarkFound}
                        >
                            <RotateCcw size={16} />
                            Mark Found
                        </button>
                    </div>
                )
            }

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
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
                {!item.is_lent && !item.is_lost && (
                    <button
                        className="btn"
                        style={{ background: '#8B5CF620', color: '#8B5CF6', border: '1px solid #8B5CF640' }}
                        onClick={() => setShowLendModal(true)}
                    >
                        <Handshake size={16} />
                        Lend to Friend
                    </button>
                )}
                {!item.is_lost && !item.is_lent && (
                    <button
                        className="btn"
                        style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}
                        onClick={() => setShowLostModal(true)}
                    >
                        <AlertTriangle size={16} />
                        Mark as Lost
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

            {/* QR Code */}
            <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <QrCode size={18} />
                        QR Code
                    </h3>
                </div>
                <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {(item.quantity || 1) === 1 ? (
                        <>
                            <img
                                src={qrApi.getItemQrUrl(item.id, 180)}
                                alt="Item QR Code"
                                style={{ width: 180, height: 180, borderRadius: 'var(--radius-md)', background: 'white' }}
                            />
                            <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                {item.name.length > 32 ? item.name.slice(0, 32) + '...' : item.name}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                Qty: {item.quantity} — {item.quantity} QR codes
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'center' }}>
                                {Array.from({ length: Math.min(item.quantity, 10) }).map((_, idx) => (
                                    <div key={idx} style={{ textAlign: 'center', background: 'var(--color-bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)' }}>
                                        <img
                                            src={qrApi.getItemSequenceQrUrl(item.id, idx + 1, item.quantity)}
                                            alt={`QR ${idx + 1}/${item.quantity}`}
                                            style={{ width: 120, height: 120, borderRadius: 'var(--radius-sm)', background: 'white' }}
                                        />
                                        <div style={{ marginTop: 'var(--space-xs)', fontSize: 11, fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                                            {idx + 1}/{item.quantity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {item.quantity > 10 && (
                                <div style={{ marginTop: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                    Showing 10 of {item.quantity}. Use Print QR to get all.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Move Modal */}
            {
                showMoveModal && (
                    <MoveItemModal
                        item={item}
                        onClose={() => setShowMoveModal(false)}
                        onSuccess={loadItem}
                    />
                )
            }

            {/* Lend Modal */}
            {
                showLendModal && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="card" style={{ width: 440, maxWidth: '90vw', padding: 0 }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Handshake size={18} style={{ color: '#8B5CF6' }} />
                                    Lend Item
                                </h3>
                                <button className="btn btn-secondary btn-icon" onClick={() => setShowLendModal(false)}><X size={16} /></button>
                            </div>
                            <form onSubmit={handleLend} style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Borrower Name *</label>
                                    <input
                                        type="text"
                                        value={lendBorrower}
                                        onChange={(e) => setLendBorrower(e.target.value)}
                                        placeholder="Who are you lending this to?"
                                        required
                                        autoFocus
                                        style={{
                                            width: '100%', padding: 'var(--space-md)',
                                            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-md)',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Due Date (optional)</label>
                                    <input
                                        type="date"
                                        value={lendDueDate}
                                        onChange={(e) => setLendDueDate(e.target.value)}
                                        style={{
                                            width: '100%', padding: 'var(--space-md)',
                                            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-md)',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Notes (optional)</label>
                                    <input
                                        type="text"
                                        value={lendNotes}
                                        onChange={(e) => setLendNotes(e.target.value)}
                                        placeholder="Any notes..."
                                        style={{
                                            width: '100%', padding: 'var(--space-md)',
                                            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-md)',
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLendModal(false)}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn"
                                        disabled={!lendBorrower.trim() || lendLoading}
                                        style={{ flex: 2, background: '#8B5CF6', color: '#fff', border: 'none', fontWeight: 600, opacity: lendBorrower.trim() ? 1 : 0.5 }}
                                    >
                                        {lendLoading ? 'Lending...' : '🤝 Lend Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Lost Modal */}
            {
                showLostModal && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="card" style={{ width: 440, maxWidth: '90vw', padding: 0 }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: '#EF4444' }}>
                                    <AlertTriangle size={18} />
                                    Mark as Lost
                                </h3>
                                <button className="btn btn-secondary btn-icon" onClick={() => setShowLostModal(false)}><X size={16} /></button>
                            </div>
                            <form onSubmit={handleMarkLost} style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <p style={{ color: 'var(--color-text-muted)' }}>
                                    This will change the item's status to "Lost" and hide it from normal inventory views until marked found.
                                </p>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>Notes (optional)</label>
                                    <textarea
                                        value={lostNotes}
                                        onChange={(e) => setLostNotes(e.target.value)}
                                        placeholder="Where was it last seen? Any details?"
                                        rows={3}
                                        autoFocus
                                        style={{
                                            width: '100%', padding: 'var(--space-md)',
                                            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-md)', resize: 'vertical'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLostModal(false)}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn"
                                        disabled={lostLoading}
                                        style={{ flex: 2, background: '#EF4444', color: '#fff', border: 'none', fontWeight: 600 }}
                                    >
                                        {lostLoading ? 'Marking...' : '⚠️ Confirm Lost'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {showEditModal && (
                <EditItemModal
                    item={item}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => {
                        loadItem();
                        setShowEditModal(false);
                    }}
                />
            )}
        </div>
    );
}

function EditItemModal({ item, onClose, onSuccess }) {
    const [name, setName] = useState(item.name);
    const [description, setDescription] = useState(item.description || '');
    const [quantity, setQuantity] = useState(item.quantity);
    const [imageUrl, setImageUrl] = useState(item.image_url || '');
    const [tags, setTags] = useState(item.tags ? item.tags.join(', ') : '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await itemApi.update(item.id, {
                name,
                description: description || null,
                quantity: parseInt(quantity),
                image_url: imageUrl || null,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to update item:', error);
            alert(error.response?.data?.detail || 'Failed to update item');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Edit Item</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="input"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input
                                type="number"
                                className="input"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Image</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                <input
                                    type="text"
                                    className="input"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                    <span>Upload Image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            try {
                                                setLoading(true);
                                                const res = await imageApi.upload(file);
                                                setImageUrl(res.data.url);
                                            } catch (error) {
                                                console.error('Failed to upload image:', error);
                                                alert('Failed to upload image');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                    />
                                </label>
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                    or paste URL above
                                </span>
                            </div>
                            {imageUrl && (
                                <div style={{ marginTop: 'var(--space-sm)', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 100, width: 100, background: 'var(--color-bg-tertiary)' }}>
                                    <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tags (comma separated)</label>
                            <input
                                type="text"
                                className="input"
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                                placeholder="tag1, tag2"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ItemDetail;

