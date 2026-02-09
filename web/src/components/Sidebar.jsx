import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    ChevronRight,
    ChevronDown,
    FolderOpen,
    Briefcase,
    Layout,
    Search,
    Plus,
    Home,
    Shirt,
    Droplets,
    Package,
    MapPin
} from 'lucide-react';
import { locationApi } from '../services/api';

const kindConfig = {
    room: { icon: Layout, color: '#6366f1', label: 'Room' },
    furniture: { icon: Box, color: '#8b5cf6', label: 'Furniture' },
    container: { icon: Package, color: '#06b6d4', label: 'Container' },
    surface: { icon: Layout, color: '#10b981', label: 'Surface' },
    portable: { icon: Briefcase, color: '#f59e0b', label: 'Portable' },
    laundry_worn: { icon: Shirt, color: '#10b981', label: 'Worn' },
    laundry_dirty: { icon: Droplets, color: '#ef4444', label: 'Dirty' },
};

function TreeNode({ node, level = 0 }) {
    const [expanded, setExpanded] = useState(level < 2);
    const location = useLocation();
    const hasChildren = node.children && node.children.length > 0;
    const config = kindConfig[node.kind] || { icon: FolderOpen, color: '#64748b' };
    const Icon = config.icon;
    const isActive = location.pathname === `/location/${node.id}`;

    return (
        <li className="tree-item">
            <div
                className={`tree-node ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                {hasChildren ? (
                    <span
                        className={`tree-toggle ${expanded ? 'expanded' : ''}`}
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                ) : (
                    <span style={{ width: 20 }} />
                )}
                <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: `${config.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Icon size={14} style={{ color: config.color }} />
                </div>
                <Link
                    to={`/location/${node.id}`}
                    style={{
                        flex: 1,
                        color: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {node.name}
                </Link>
                {(node.item_count > 0 || node.children_count > 0) && (
                    <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-bg-tertiary)',
                        padding: '2px 6px',
                        borderRadius: 10,
                        marginLeft: 'auto',
                    }}>
                        {node.item_count > 0 ? node.item_count : node.children_count}
                    </span>
                )}
            </div>
            {hasChildren && expanded && (
                <ul className="tree-children" style={{ borderLeft: '1px solid var(--color-border)', marginLeft: level * 16 + 18 }}>
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} level={level + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
}

function NavItem({ to, icon: Icon, label, color, isActive }) {
    return (
        <Link
            to={to}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
            }}
            onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
        >
            <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={16} style={{ color }} />
            </div>
            <span style={{ fontWeight: isActive ? 600 : 500 }}>{label}</span>
        </Link>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: 'var(--space-md) var(--space-md) var(--space-sm)',
        }}>
            {children}
        </div>
    );
}

function Sidebar() {
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        loadTree();
    }, []);

    const loadTree = async () => {
        try {
            const response = await locationApi.getTree();
            setTree(response.data);
        } catch (error) {
            console.error('Failed to load location tree:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <Link to="/" className="sidebar-logo">
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Box size={20} style={{ color: 'white' }} />
                    </div>
                    <span style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 700,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Storage
                    </span>
                </Link>
            </div>

            {/* Search */}
            <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div className="search-box">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search items..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                                navigate(`/search?q=${encodeURIComponent(e.target.value)}`);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Quick Add */}
            <div style={{ padding: '0 var(--space-md) var(--space-md)' }}>
                <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => navigate('/?action=add-location')}
                >
                    <Plus size={16} />
                    Add Location
                </button>
            </div>

            <nav className="sidebar-content">
                {/* Main Navigation */}
                <SectionLabel>Menu</SectionLabel>
                <div style={{ padding: '0 var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <NavItem
                        to="/"
                        icon={Home}
                        label="Dashboard"
                        color="#6366f1"
                        isActive={location.pathname === '/'}
                    />
                    <NavItem
                        to="/wardrobe"
                        icon={Shirt}
                        label="Wardrobe"
                        color="#10b981"
                        isActive={location.pathname === '/wardrobe'}
                    />
                    <NavItem
                        to="/search"
                        icon={Search}
                        label="Search"
                        color="#3b82f6"
                        isActive={location.pathname === '/search'}
                    />
                    <NavItem
                        to="/laundry"
                        icon={Droplets}
                        label="Laundry"
                        color="#ef4444"
                        isActive={location.pathname === '/laundry'}
                    />
                    <NavItem
                        to="/outfits"
                        icon={Shirt}
                        label="Outfits"
                        color="#8b5cf6"
                        isActive={location.pathname === '/outfits'}
                    />
                </div>

                {/* Locations */}
                <SectionLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <MapPin size={12} />
                        Locations
                    </div>
                </SectionLabel>

                {loading ? (
                    <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        Loading...
                    </div>
                ) : tree.length === 0 ? (
                    <div style={{
                        padding: 'var(--space-md)',
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--font-size-sm)',
                        textAlign: 'center',
                    }}>
                        <MapPin size={24} style={{ marginBottom: 'var(--space-sm)', opacity: 0.5 }} />
                        <div>No locations yet</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                            Click "Add Location" to start
                        </div>
                    </div>
                ) : (
                    <ul className="tree" style={{ padding: '0 var(--space-xs)' }}>
                        {tree.map(node => (
                            <TreeNode key={node.id} node={node} />
                        ))}
                    </ul>
                )}
            </nav>

            {/* Footer */}
            <div style={{
                padding: 'var(--space-md)',
                borderTop: '1px solid var(--color-border)',
            }}>
                <Link
                    to="/settings"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-sm) var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        color: location.pathname === '/settings' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        background: location.pathname === '/settings' ? 'var(--color-bg-tertiary)' : 'transparent',
                        textDecoration: 'none',
                        fontSize: 'var(--font-size-sm)',
                    }}
                >
                    ⚙️ Settings
                </Link>
            </div>
        </aside>
    );
}

export default Sidebar;
