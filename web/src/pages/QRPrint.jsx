import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckSquare, Square, Download, ChevronRight, ChevronDown, Minus } from 'lucide-react';
import { locationApi, itemApi, wardrobeApi, qrApi } from '../services/api';

// Get all descendant IDs from a node
const getAllDescendantIds = (node) => {
    let ids = [node.id];
    if (node.children) {
        for (const child of node.children) {
            ids = ids.concat(getAllDescendantIds(child));
        }
    }
    return ids;
};

// Check selection state: 'none', 'partial', 'all'
const getSelectionState = (node, selection) => {
    const allIds = getAllDescendantIds(node);
    const selectedCount = allIds.filter(id => selection.has(id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === allIds.length) return 'all';
    return 'partial';
};

// Flatten tree for items/clothing display
const flattenTree = (nodes, depth = 0) => {
    let result = [];
    for (const node of nodes) {
        result.push({ ...node, depth });
        if (node.children && node.children.length > 0) {
            result = result.concat(flattenTree(node.children, depth + 1));
        }
    }
    return result;
};

function LocationTreeNode({ node, selection, onToggle, depth = 0 }) {
    const [expanded, setExpanded] = useState(depth < 2);
    const hasChildren = node.children && node.children.length > 0;
    const selectionState = getSelectionState(node, selection);

    const handleToggle = (e) => {
        e.stopPropagation();
        onToggle(node, selectionState);
    };

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    paddingLeft: `${depth * 20 + 12}px`,
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
                onClick={handleToggle}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                {/* Expand/Collapse */}
                {hasChildren ? (
                    <span
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        style={{
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 4,
                            color: 'var(--color-text-muted)',
                            flexShrink: 0,
                        }}
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                ) : (
                    <span style={{ width: 20, flexShrink: 0 }} />
                )}

                {/* Checkbox */}
                <div
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        border: `2px solid ${selectionState !== 'none' ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                        background: selectionState === 'all' ? 'var(--color-accent-primary)'
                            : selectionState === 'partial' ? 'rgba(99, 102, 241, 0.3)'
                                : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                    }}
                >
                    {selectionState === 'all' && <CheckSquare size={14} />}
                    {selectionState === 'partial' && <Minus size={14} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {node.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {node.kind || 'Location'}
                        {hasChildren && ` • ${node.children.length} sub-locations`}
                    </div>
                </div>

                {/* Count badge */}
                {node.item_count > 0 && (
                    <span style={{
                        fontSize: '0.7rem',
                        background: 'var(--color-bg-tertiary)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        color: 'var(--color-text-muted)',
                        fontWeight: 600,
                    }}>
                        {node.item_count} items
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && expanded && (
                <div style={{ borderLeft: '2px solid var(--color-border)', marginLeft: `${depth * 20 + 22}px` }}>
                    {node.children.map(child => (
                        <LocationTreeNode
                            key={child.id}
                            node={child}
                            selection={selection}
                            onToggle={onToggle}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function QRPrint() {
    const [activeTab, setActiveTab] = useState('locations');
    const [loading, setLoading] = useState(true);

    // Data
    const [locationTree, setLocationTree] = useState([]);
    const [items, setItems] = useState([]);
    const [clothing, setClothing] = useState([]);

    // Selection
    const [selectedLocations, setSelectedLocations] = useState(new Set());
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectedClothing, setSelectedClothing] = useState(new Set());

    const loadData = async () => {
        try {
            const [treeRes, itemRes, clothRes] = await Promise.all([
                locationApi.getTree(),
                itemApi.list(),
                wardrobeApi.listClothing(),
            ]);
            setLocationTree(treeRes.data || []);
            setItems((itemRes.data || []).filter(i => i.item_type !== 'clothing'));
            setClothing(clothRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handle location toggle with cascade
    const handleLocationToggle = useCallback((node, currentState) => {
        const allIds = getAllDescendantIds(node);

        setSelectedLocations(prev => {
            const newSet = new Set(prev);
            if (currentState === 'all') {
                // Deselect all
                allIds.forEach(id => newSet.delete(id));
            } else {
                // Select all
                allIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    }, []);

    const toggleSelection = (id, type) => {
        const setFn = type === 'items' ? setSelectedItems : setSelectedClothing;
        setFn(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    // Get all location IDs from tree
    const getAllLocationIds = useCallback(() => {
        return locationTree.flatMap(node => getAllDescendantIds(node));
    }, [locationTree]);

    const selectAllLocations = () => {
        setSelectedLocations(new Set(getAllLocationIds()));
    };

    const deselectAllLocations = () => {
        setSelectedLocations(new Set());
    };

    const selectAll = (type) => {
        if (type === 'items') setSelectedItems(new Set(items.map(i => i.id)));
        else setSelectedClothing(new Set(clothing.map(c => c.id)));
    };

    const deselectAll = (type) => {
        if (type === 'items') setSelectedItems(new Set());
        else setSelectedClothing(new Set());
    };

    const generatePDF = () => {
        let ids = [];
        let type = 'locations';

        if (activeTab === 'locations') {
            ids = Array.from(selectedLocations);
            type = 'locations';
        } else if (activeTab === 'items') {
            ids = Array.from(selectedItems);
            type = 'items';
        } else {
            ids = Array.from(selectedClothing);
            type = 'items';
        }

        if (ids.length === 0) {
            alert('Please select at least one item to print.');
            return;
        }

        const url = qrApi.getBulkPdfUrl(type, ids);
        window.open(url, '_blank');
    };

    const getCurrentSelection = () => {
        if (activeTab === 'locations') return selectedLocations;
        if (activeTab === 'items') return selectedItems;
        return selectedClothing;
    };

    const currentSelection = getCurrentSelection();
    const totalLocations = getAllLocationIds().length;

    const tabs = [
        { id: 'locations', label: '📍 Locations', count: totalLocations },
        { id: 'items', label: '📦 Items', count: items.length },
        { id: 'clothing', label: '👕 Clothing', count: clothing.length },
    ];

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <RefreshCw size={32} className="spinning" style={{ color: 'var(--color-text-muted)' }} />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">🖨️ Print QR Codes</h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: 1 }}
                    >
                        {tab.label}
                        <span style={{
                            marginLeft: '0.5rem',
                            background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-tertiary)',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Selection Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {activeTab === 'locations' ? (
                        <>
                            <button className="btn btn-secondary btn-sm" onClick={selectAllLocations}>
                                <CheckSquare size={16} /> Select All
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={deselectAllLocations}>
                                <Square size={16} /> Deselect All
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-secondary btn-sm" onClick={() => selectAll(activeTab)}>
                                <CheckSquare size={16} /> Select All
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => deselectAll(activeTab)}>
                                <Square size={16} /> Deselect All
                            </button>
                        </>
                    )}
                </div>
                <span style={{ fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                    {currentSelection.size} selected
                </span>
            </div>

            {/* Helper text for locations */}
            {activeTab === 'locations' && (
                <div style={{
                    padding: '10px 14px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                }}>
                    💡 <strong>Tip:</strong> Clicking a parent location selects/deselects all its children.
                    A dash (<Minus size={12} style={{ verticalAlign: 'middle' }} />) means some children are selected.
                </div>
            )}

            {/* List */}
            <div className="card" style={{ maxHeight: '50vh', overflow: 'auto', marginBottom: '1.5rem' }}>
                {activeTab === 'locations' ? (
                    locationTree.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            No locations found
                        </div>
                    ) : (
                        locationTree.map(node => (
                            <LocationTreeNode
                                key={node.id}
                                node={node}
                                selection={selectedLocations}
                                onToggle={handleLocationToggle}
                            />
                        ))
                    )
                ) : (
                    // Items/Clothing flat list
                    (activeTab === 'items' ? items : clothing).length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            No {activeTab} found
                        </div>
                    ) : (
                        (activeTab === 'items' ? items : clothing).map(item => (
                            <div
                                key={item.id}
                                onClick={() => toggleSelection(item.id, activeTab)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--color-border)',
                                    background: currentSelection.has(item.id) ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!currentSelection.has(item.id)) e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                                }}
                                onMouseLeave={e => {
                                    if (!currentSelection.has(item.id)) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 5,
                                    border: `2px solid ${currentSelection.has(item.id) ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                                    background: currentSelection.has(item.id) ? 'var(--color-accent-primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    flexShrink: 0,
                                }}>
                                    {currentSelection.has(item.id) && <CheckSquare size={14} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600,
                                        color: 'var(--color-text-primary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>{item.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Qty: {item.quantity || 1}{(item.quantity || 1) > 1 ? ` (${item.quantity} QR codes)` : ''}
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Generate Button */}
            <button
                className="btn btn-primary"
                onClick={generatePDF}
                disabled={currentSelection.size === 0}
                style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1rem',
                    opacity: currentSelection.size === 0 ? 0.5 : 1,
                }}
            >
                <Download size={20} />
                Generate PDF ({currentSelection.size} {activeTab === 'locations' ? 'locations' : 'items'})
            </button>
        </div>
    );
}

export default QRPrint;
