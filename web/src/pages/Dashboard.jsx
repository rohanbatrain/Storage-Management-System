import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Box,
    Package,
    Clock,
    AlertTriangle,
    Plus,
    X,
    Search,
    Home,
    Shirt,
    FolderOpen,
    ArrowRight,
    Sparkles,
    Layout,
    Briefcase
} from 'lucide-react';
import { locationApi, itemApi } from '../services/api';

// Visual type selector data
const LOCATION_TYPES = [
    { kind: 'room', icon: Home, label: 'Room', description: 'Bedroom, Kitchen, Bathroom', color: '#6366f1' },
    { kind: 'furniture', icon: Box, label: 'Furniture', description: 'Wardrobe, Desk, Shelf', color: '#8b5cf6' },
    { kind: 'container', icon: Package, label: 'Container', description: 'Box, Drawer, Bin', color: '#06b6d4' },
    { kind: 'surface', icon: Layout, label: 'Surface', description: 'Countertop, Table', color: '#10b981' },
    { kind: 'portable', icon: Briefcase, label: 'Portable', description: 'Bag, Suitcase', color: '#f59e0b' },
];

function StatCard({ icon: Icon, value, label, color, onClick }) {
    return (
        <div
            className="stat-card"
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Icon size={24} style={{ color }} />
                </div>
                <span className="stat-value">{value}</span>
            </div>
            <span className="stat-label">{label}</span>
        </div>
    );
}

function AddLocationModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [kind, setKind] = useState('room');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step === 1) {
            setStep(2);
            return;
        }

        setLoading(true);
        try {
            await locationApi.create({ name, kind });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create location:', error);
            alert(error.response?.data?.detail || 'Failed to create location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {step === 1 ? '📍 Name Your Location' : '🏠 Choose Type'}
                    </h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {step === 1 ? (
                            <div className="form-group">
                                <label className="form-label">What do you want to call this location?</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Master Bedroom, Kitchen, Garage"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    autoFocus
                                    style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--space-md)' }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                {LOCATION_TYPES.map(type => (
                                    <div
                                        key={type.kind}
                                        onClick={() => setKind(type.kind)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-md)',
                                            padding: 'var(--space-md)',
                                            borderRadius: 'var(--radius-md)',
                                            border: kind === type.kind
                                                ? `2px solid ${type.color}`
                                                : '2px solid var(--color-border)',
                                            background: kind === type.kind
                                                ? `${type.color}15`
                                                : 'var(--color-bg-tertiary)',
                                            cursor: 'pointer',
                                            transition: 'all var(--transition-fast)',
                                        }}
                                    >
                                        <div style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 'var(--radius-md)',
                                            background: `${type.color}25`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <type.icon size={22} style={{ color: type.color }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{type.label}</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                {type.description}
                                            </div>
                                        </div>
                                        {kind === type.kind && (
                                            <div style={{ marginLeft: 'auto', color: type.color }}>✓</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {step === 2 && (
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setStep(1)}
                            >
                                ← Back
                            </button>
                        )}
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
                            {loading ? 'Creating...' : step === 1 ? 'Next →' : 'Create Location'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EmptyStateOnboarding({ onAddLocation }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-2xl)',
            textAlign: 'center',
            background: 'var(--gradient-surface)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
        }}>
            <div style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-accent-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-lg)',
            }}>
                <Sparkles size={40} style={{ color: 'var(--color-accent-primary)' }} />
            </div>
            <h2 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                marginBottom: 'var(--space-sm)'
            }}>
                Welcome to Your Storage Manager!
            </h2>
            <p style={{
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-xl)',
                maxWidth: 400
            }}>
                Start by creating your first room. You can then add furniture, containers, and items to organize everything.
            </p>
            <button className="btn btn-primary" onClick={onAddLocation} style={{ padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--font-size-md)' }}>
                <Plus size={20} />
                Create Your First Room
            </button>
        </div>
    );
}

function QuickActionCard({ icon: Icon, title, description, onClick, color }) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-lg)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.transform = 'translateY(0)';
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
                flexShrink: 0,
            }}>
                <Icon size={24} style={{ color }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    {description}
                </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
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
            const locationsRes = await locationApi.list();
            const itemsRes = await itemApi.list({});
            const tempRes = await itemApi.list({ temporary_only: true });

            setStats({
                locations: locationsRes.data.length,
                items: itemsRes.data.length,
                temporary: tempRes.data.length,
                recentMoves: itemsRes.data.filter(i => i.last_moved_at).length
            });

            setTemporaryItems(tempRes.data.slice(0, 5));

            const sorted = [...itemsRes.data]
                .filter(i => i.last_moved_at)
                .sort((a, b) => new Date(b.last_moved_at) - new Date(a.last_moved_at));
            setRecentItems(sorted.slice(0, 5));

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    // Show onboarding if no locations
    if (stats.locations === 0) {
        return (
            <div>
                <EmptyStateOnboarding onAddLocation={() => setShowAddModal(true)} />
                {showAddModal && (
                    <AddLocationModal
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            loadDashboardData();
                            window.location.reload();
                        }}
                    />
                )}
            </div>
        );
    }

    return (
        <div>
            {/* Hero Section */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 700,
                    marginBottom: 'var(--space-xs)'
                }}>
                    Welcome Back! 👋
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Here's what's happening in your storage space
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

            {/* Quick Actions */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', fontWeight: 600 }}>Quick Actions</h3>
                <div className="grid grid-3">
                    <QuickActionCard
                        icon={Plus}
                        title="Add New Room"
                        description="Create a new storage location"
                        color="var(--color-accent-primary)"
                        onClick={() => setShowAddModal(true)}
                    />
                    <QuickActionCard
                        icon={Search}
                        title="Find Something"
                        description="Search your items and locations"
                        color="var(--color-info)"
                        onClick={() => navigate('/search')}
                    />
                    <QuickActionCard
                        icon={Shirt}
                        title="Wardrobe"
                        description="Manage your clothing items"
                        color="var(--color-success)"
                        onClick={() => navigate('/wardrobe')}
                    />
                </div>
            </div>

            <div className="grid grid-2">
                {/* Temporary Items Alert */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                            Temporary Placements
                        </h3>
                        {temporaryItems.length > 0 && (
                            <span className="badge badge-warning">{temporaryItems.length}</span>
                        )}
                    </div>
                    {temporaryItems.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                ✓ No items in temporary locations
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

            {showAddModal && (
                <AddLocationModal
                    onClose={() => {
                        setShowAddModal(false);
                        navigate('/', { replace: true });
                    }}
                    onSuccess={() => {
                        loadDashboardData();
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}

export default Dashboard;
