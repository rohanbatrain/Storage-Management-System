import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Package,
    Clock,
    AlertTriangle,
    Plus,
    X
} from 'lucide-react';
import { locationApi, itemApi } from '../services/api';

function StatCard({ icon: Icon, value, label, color }) {
    return (
        <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Icon size={20} style={{ color }} />
                <span className="stat-value">{value}</span>
            </div>
            <span className="stat-label">{label}</span>
        </div>
    );
}

function AddLocationModal({ onClose, onSuccess, parentId = null }) {
    const [name, setName] = useState('');
    const [kind, setKind] = useState('room');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            console.error('Failed to create location:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add New Location</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Location Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Living Room, Wardrobe, Backpack"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select
                                className="form-select"
                                value={kind}
                                onChange={e => setKind(e.target.value)}
                            >
                                <option value="room">🏠 Room (Bedroom, Bathroom)</option>
                                <option value="furniture">🪑 Furniture (Almirah, Bed, Table)</option>
                                <option value="container">📦 Container (Box, Drawer, Bin)</option>
                                <option value="surface">📋 Surface (Shelf, Counter)</option>
                                <option value="portable">🎒 Portable (Bag, Suitcase)</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Location'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Dashboard() {
    const [stats, setStats] = useState({
        locations: 0,
        items: 0,
        temporary: 0,
        recentMoves: 0
    });
    const [temporaryItems, setTemporaryItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
        if (searchParams.get('action') === 'add-location') {
            setShowAddModal(true);
        }
    }, [searchParams]);

    const loadDashboardData = async () => {
        try {
            // Load locations
            const locationsRes = await locationApi.list();

            // Load all items
            const itemsRes = await itemApi.list({});

            // Load temporary items
            const tempRes = await itemApi.list({ temporary_only: true });

            setStats({
                locations: locationsRes.data.length,
                items: itemsRes.data.length,
                temporary: tempRes.data.length,
                recentMoves: itemsRes.data.filter(i => i.last_moved_at).length
            });

            setTemporaryItems(tempRes.data.slice(0, 5));

            // Sort by last moved and take recent
            const sorted = [...itemsRes.data]
                .filter(i => i.last_moved_at)
                .sort((a, b) => new Date(b.last_moved_at) - new Date(a.last_moved_at));
            setRecentItems(sorted.slice(0, 5));

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
                    Dashboard
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Overview of your storage organization
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
                <StatCard
                    icon={Box}
                    value={stats.locations}
                    label="Storage Locations"
                    color="var(--color-accent-primary)"
                />
                <StatCard
                    icon={Package}
                    value={stats.items}
                    label="Total Items"
                    color="var(--color-success)"
                />
                <StatCard
                    icon={AlertTriangle}
                    value={stats.temporary}
                    label="Temporary Placements"
                    color="var(--color-warning)"
                />
                <StatCard
                    icon={Clock}
                    value={stats.recentMoves}
                    label="Items Moved"
                    color="var(--color-info)"
                />
            </div>

            <div className="grid grid-2">
                {/* Temporary Items Alert */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                            Temporary Placements
                        </h3>
                    </div>
                    {temporaryItems.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                No items in temporary locations ✓
                            </p>
                        </div>
                    ) : (
                        <div className="item-list">
                            {temporaryItems.map(item => (
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
                                                Currently at: {item.current_location?.name || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge badge-warning">Temporary</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Clock size={18} style={{ color: 'var(--color-info)' }} />
                            Recently Moved
                        </h3>
                    </div>
                    {recentItems.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                No recent item movements
                            </p>
                        </div>
                    ) : (
                        <div className="item-list">
                            {recentItems.map(item => (
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
                                                {item.current_location?.name || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                        {new Date(item.last_moved_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} />
                        Add Location
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/search')}>
                        Find Item
                    </button>
                </div>
            </div>

            {showAddModal && (
                <AddLocationModal
                    onClose={() => {
                        setShowAddModal(false);
                        navigate('/', { replace: true });
                    }}
                    onSuccess={() => {
                        loadDashboardData();
                        window.location.reload(); // Refresh sidebar tree
                    }}
                />
            )}
        </div>
    );
}

export default Dashboard;
