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
    MapPin,
    Handshake,
    AlertTriangle
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

// Max depth before we start compressing the indent
const MAX_INDENT_LEVEL = 3;

function TreeNode({ node, level = 0, parentPath = [] }) {
    const [expanded, setExpanded] = useState(level < 2);
    const location = useLocation();
    const hasChildren = node.children && node.children.length > 0;
    const config = kindConfig[node.kind] || { icon: FolderOpen, color: '#64748b' };
    const Icon = config.icon;
    const isActive = location.pathname === `/location/${node.id}`;

    // Compress indent for deep nesting (max 3 levels of visual indent)
    const visualLevel = Math.min(level, MAX_INDENT_LEVEL);
    const isDeepNested = level > MAX_INDENT_LEVEL;

    // Build breadcrumb path for deeply nested items
    const currentPath = [...parentPath, node.name];

    return (
        <li className="tree-item" style={{ listStyle: 'none' }}>
            <div
                className={`tree-node ${isActive ? 'active' : ''}`}
                style={{
                    paddingLeft: `${visualLevel * 12 + 8}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: `6px ${visualLevel * 12 + 8}px`,
                    borderRadius: '6px',
                    margin: '1px 4px',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                }}
                onMouseEnter={e => {
                    if (!isActive) {
                        e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                {/* Expand/Collapse Toggle */}
                {hasChildren ? (
                    <span
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            color: 'var(--color-text-muted)',
                            flexShrink: 0,
                        }}
                    >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                ) : (
                    <span style={{ width: 18, flexShrink: 0 }} />
                )}

                {/* Icon */}
                <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    background: `${config.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Icon size={12} style={{ color: config.color }} />
                </div>

                {/* Name & Depth Indicator */}
                <Link
                    to={`/location/${node.id}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                        flex: 1,
                        color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 600 : 500,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    {/* Show depth indicator for deep nesting */}
                    {isDeepNested && (
                        <span style={{
                            fontSize: '0.65rem',
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-bg-tertiary)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontWeight: 600,
                        }}>
                            L{level + 1}
                        </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {node.name}
                    </span>
                </Link>

                {/* Count Badge */}
                {(node.item_count > 0 || (hasChildren && node.children_count > 0)) && (
                    <span style={{
                        fontSize: '0.65rem',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-bg-tertiary)',
                        padding: '2px 6px',
                        borderRadius: 10,
                        fontWeight: 600,
                        flexShrink: 0,
                    }}>
                        {node.item_count > 0 ? `${node.item_count}` : `${node.children_count}↓`}
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && expanded && (
                <ul style={{
                    margin: 0,
                    padding: 0,
                    marginLeft: visualLevel < MAX_INDENT_LEVEL ? 12 : 0,
                    borderLeft: visualLevel < MAX_INDENT_LEVEL ? '1px solid var(--color-border)' : 'none',
                }}>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            parentPath={currentPath}
                        />
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
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
                fontSize: '0.875rem',
            }}
            onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
        >
            <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={14} style={{ color }} />
            </div>
            <span style={{ fontWeight: isActive ? 600 : 500 }}>{label}</span>
        </Link>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.75px',
            padding: '16px 12px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        }}>
            {children}
        </div>
    );
}

function Sidebar() {
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
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
        <aside className="sidebar" style={{
            width: 260,
            height: '100vh',
            background: 'var(--color-bg-secondary)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Logo */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    }}>
                        <Box size={16} style={{ color: 'white' }} />
                    </div>
                    <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Storage
                    </span>
                </Link>
            </div>

            {/* Search */}
            <div style={{ padding: '12px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                }}>
                    <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Search..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.85rem',
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                                navigate(`/search?q=${encodeURIComponent(e.target.value)}`);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Quick Add */}
            <div style={{ padding: '0 12px 12px' }}>
                <button
                    onClick={() => navigate('/?action=add-location')}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.35)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.25)';
                    }}
                >
                    <Plus size={16} />
                    Add Location
                </button>
            </div>

            <nav style={{ flex: 1, overflow: 'auto', paddingBottom: '12px' }}>
                {/* Main Navigation */}
                <SectionLabel>Menu</SectionLabel>
                <div style={{ padding: '0 8px', marginBottom: '8px' }}>
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
                    <NavItem
                        to="/lent"
                        icon={Handshake}
                        label="Lent Items"
                        color="#a855f7"
                        isActive={location.pathname === '/lent'}
                    />
                    <NavItem
                        to="/lost"
                        icon={AlertTriangle}
                        label="Lost Items"
                        color="#ef4444"
                        isActive={location.pathname === '/lost'}
                    />
                </div>

                {/* Locations Tree */}
                <SectionLabel>
                    <MapPin size={10} />
                    Locations
                </SectionLabel>

                {loading ? (
                    <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                        Loading...
                    </div>
                ) : tree.length === 0 ? (
                    <div style={{
                        padding: '20px 16px',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                    }}>
                        <MapPin size={20} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <div>No locations yet</div>
                        <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>
                            Click "Add Location" to start
                        </div>
                    </div>
                ) : (
                    <ul style={{ margin: 0, padding: '0 4px' }}>
                        {tree.map(node => (
                            <TreeNode key={node.id} node={node} />
                        ))}
                    </ul>
                )}
            </nav>

            {/* Footer */}
            <div style={{
                padding: '12px',
                borderTop: '1px solid var(--color-border)',
            }}>
                <Link
                    to="/settings"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        color: location.pathname === '/settings' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        background: location.pathname === '/settings' ? 'var(--color-bg-tertiary)' : 'transparent',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        if (location.pathname !== '/settings') {
                            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (location.pathname !== '/settings') {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                >
                    ⚙️ Settings
                </Link>
            </div>
        </aside>
    );
}

export default Sidebar;
