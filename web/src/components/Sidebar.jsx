import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    ChevronRight,
    FolderOpen,
    Briefcase,
    Layout,
    Search,
    Plus,
    Home,
    Shirt,
    Droplets
} from 'lucide-react';
import { locationApi } from '../services/api';

const kindIcons = {
    room: Layout,
    furniture: Box,
    container: Box,
    surface: Layout,
    portable: Briefcase,
    laundry_worn: Shirt,
    laundry_dirty: Droplets,
};

function TreeNode({ node, level = 0 }) {
    const [expanded, setExpanded] = useState(level < 2);
    const location = useLocation();
    const hasChildren = node.children && node.children.length > 0;
    const Icon = kindIcons[node.kind] || FolderOpen;
    const isActive = location.pathname === `/location/${node.id}`;

    return (
        <li className="tree-item">
            <div
                className={`tree-node ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
                {hasChildren ? (
                    <span
                        className={`tree-toggle ${expanded ? 'expanded' : ''}`}
                        onClick={() => setExpanded(!expanded)}
                    >
                        <ChevronRight size={14} />
                    </span>
                ) : (
                    <span style={{ width: 20 }} />
                )}
                <Icon size={16} className="tree-icon" />
                <Link to={`/location/${node.id}`} style={{ flex: 1, color: 'inherit' }}>
                    {node.name}
                </Link>
                {node.item_count > 0 && (
                    <span className="badge badge-primary">{node.item_count}</span>
                )}
            </div>
            {hasChildren && expanded && (
                <ul className="tree-children">
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} level={level + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
}

function Sidebar() {
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
            <div className="sidebar-header">
                <Link to="/" className="sidebar-logo">
                    <Box size={24} />
                    <span>PSMS</span>
                </Link>
            </div>

            <div style={{ padding: 'var(--space-md)' }}>
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
                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <Link
                        to="/"
                        className="tree-node"
                        style={{ color: 'inherit' }}
                    >
                        <Home size={16} className="tree-icon" />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        to="/wardrobe"
                        className="tree-node"
                        style={{ color: 'inherit', marginTop: 'var(--space-xs)' }}
                    >
                        <Shirt size={16} className="tree-icon" />
                        <span>Wardrobe</span>
                    </Link>
                </div>

                {loading ? (
                    <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-muted)' }}>
                        Loading locations...
                    </div>
                ) : tree.length === 0 ? (
                    <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-muted)' }}>
                        No locations yet
                    </div>
                ) : (
                    <ul className="tree">
                        {tree.map(node => (
                            <TreeNode key={node.id} node={node} />
                        ))}
                    </ul>
                )}
            </nav>
        </aside>
    );
}

export default Sidebar;
