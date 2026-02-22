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
    { kind: 'portable', icon: Briefcase, label: 'Portable', description: 'Backpack, Laptop Bag, Suitcase', color: '#f59e0b' },
    { kind: 'furniture', icon: Box, label: 'Furniture', description: 'Wardrobe, Desk, Shelf', color: '#8b5cf6' },
    { kind: 'container', icon: Package, label: 'Container', description: 'Box, Drawer, Bin', color: '#06b6d4' },
    { kind: 'surface', icon: Layout, label: 'Surface', description: 'Countertop, Table', color: '#10b981' },
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
            const response = await locationApi.create({ name, kind });
            onSuccess(response.data);
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
                                    placeholder="e.g., Bedroom, College Bag, Kitchen"
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
    const features = [
        { icon: Home, label: 'Rooms', desc: 'Organize by space', color: '#6366f1' },
        { icon: Briefcase, label: 'Bags', desc: 'Track portable items', color: '#f59e0b' },
        { icon: Package, label: 'Containers', desc: 'Boxes & drawers', color: '#06b6d4' },
    ];

    return (
        <div style={{
            minHeight: 'calc(100vh - 0px)',
            margin: 'calc(-1 * var(--space-xl))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-2xl)',
            textAlign: 'center',
            background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
            backgroundColor: 'var(--color-bg-primary)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Decorative circles */}
            <div style={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 300,
                height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: -50,
                left: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Main icon */}
            <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-xl)',
                boxShadow: '0 20px 60px rgba(99, 102, 241, 0.4)',
                animation: 'pulse 2s ease-in-out infinite',
            }}>
                <Box size={48} style={{ color: 'white' }} />
            </div>

            <h1 style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                fontWeight: 800,
                marginBottom: 'var(--space-sm)',
                background: 'linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent-primary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
            }}>
                Welcome to Storage Manager
            </h1>

            <p style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-lg)',
                marginBottom: 'var(--space-2xl)',
                maxWidth: 450,
                lineHeight: 1.6,
            }}>
                Organize everything you own. Never lose track of where you put things again.
            </p>

            {/* Feature cards */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-2xl)',
                flexWrap: 'wrap',
                justifyContent: 'center',
            }}>
                {features.map((f, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: 'var(--space-lg)',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        minWidth: 130,
                        transition: 'all 0.3s ease',
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.borderColor = f.color;
                            e.currentTarget.style.boxShadow = `0 12px 30px ${f.color}20`;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-md)',
                            background: `${f.color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 'var(--space-sm)',
                        }}>
                            <f.icon size={24} style={{ color: f.color }} />
                        </div>
                        <span style={{ fontWeight: 600, marginBottom: 4 }}>{f.label}</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{f.desc}</span>
                    </div>
                ))}
            </div>

            {/* CTA Button */}
            <button
                className="btn btn-primary"
                onClick={onAddLocation}
                style={{
                    padding: 'var(--space-md) var(--space-2xl)',
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary) 100%)',
                    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
                    border: 'none',
                }}
            >
                <Plus size={20} />
                Get Started
            </button>

            <p style={{
                marginTop: 'var(--space-lg)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)'
            }}>
                Takes less than 30 seconds to add your first location
            </p>
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
                        onClose={() => {
                            setShowAddModal(false);
                            navigate('/', { replace: true });
                        }}
                        onSuccess={(newLocation) => {
                            setShowAddModal(false);
                            if (newLocation && newLocation.id) {
                                navigate(`/location/${newLocation.id}`);
                            } else {
                                loadDashboardData();
                            }
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
                    onSuccess={(newLocation) => {
                        setShowAddModal(false);
                        if (newLocation && newLocation.id) {
                            navigate(`/location/${newLocation.id}`);
                        } else {
                            loadDashboardData();
                        }
                    }}
                />
            )}
        </div>
    );
}

export default Dashboard;
