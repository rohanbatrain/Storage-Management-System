import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, AlertTriangle, RotateCcw, Package, Clock, Search } from 'lucide-react';
import { itemApi } from '../services/api';

function LentItems() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, overdue, active

    useEffect(() => {
        loadLentItems();
    }, []);

    const loadLentItems = async () => {
        setLoading(true);
        try {
            const res = await itemApi.listLent();
            setItems(res.data);
        } catch (error) {
            console.error('Failed to load lent items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnLoan = async (itemId) => {
        try {
            await itemApi.returnLoan(itemId);
            loadLentItems();
        } catch (error) {
            console.error('Failed to return loan:', error);
        }
    };

    const now = new Date();
    const overdueItems = items.filter(i => i.due_date && new Date(i.due_date) < now);
    const activeItems = items.filter(i => !i.due_date || new Date(i.due_date) >= now);

    const filteredItems = filter === 'overdue' ? overdueItems
        : filter === 'active' ? activeItems
            : items;

    const getDaysInfo = (item) => {
        if (!item.lent_at) return '';
        const days = Math.floor((now - new Date(item.lent_at)) / (1000 * 60 * 60 * 24));
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    };

    const getDueInfo = (item) => {
        if (!item.due_date) return null;
        const dueDate = new Date(item.due_date);
        const diff = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
        if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`, isOverdue: true };
        if (diff === 0) return { text: 'Due today', isOverdue: true };
        return { text: `Due in ${diff} day${diff !== 1 ? 's' : ''}`, isOverdue: false };
    };

    if (loading) {
        return <div style={{ color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>Loading lent items...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <Handshake size={32} style={{ color: '#8B5CF6' }} />
                        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>Lent Items</h1>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                        Track items you've lent to friends
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'all' ? '2px solid #8B5CF6' : 'none' }}
                    onClick={() => setFilter('all')}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{items.length}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Total Lent</div>
                </div>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'overdue' ? '2px solid #EF4444' : 'none' }}
                    onClick={() => setFilter('overdue')}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{overdueItems.length}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Overdue</div>
                </div>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer', border: filter === 'active' ? '2px solid var(--color-success)' : 'none' }}
                    onClick={() => setFilter('active')}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-success)' }}>{activeItems.length}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>On Time</div>
                </div>
            </div>

            {/* Items List */}
            {filteredItems.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: 48, marginBottom: 'var(--space-md)' }}>🎉</div>
                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>
                        {filter === 'overdue' ? 'No overdue items!' : filter === 'active' ? 'No active loans' : 'Nothing lent out'}
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {filter === 'all' ? 'Use the "Lend to Friend" button on any item to track loans.' : 'Everything is on schedule.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {filteredItems.map(item => {
                        const dueInfo = getDueInfo(item);
                        return (
                            <div
                                key={item.id}
                                className="card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-lg)',
                                    padding: 'var(--space-lg)',
                                    borderLeft: `4px solid ${dueInfo?.isOverdue ? '#EF4444' : '#8B5CF6'}`,
                                    transition: 'transform 0.15s',
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                                    background: dueInfo?.isOverdue ? '#EF444420' : '#8B5CF620',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24, flexShrink: 0,
                                }}>
                                    {dueInfo?.isOverdue ? '⚠️' : '🤝'}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Link to={`/item/${item.id}`} style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                                        {item.name}
                                    </Link>
                                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 4, flexWrap: 'wrap' }}>
                                        <span style={{ color: '#8B5CF6', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                            → {item.lent_to}
                                        </span>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                            Lent {getDaysInfo(item)}
                                        </span>
                                        {dueInfo && (
                                            <span style={{
                                                color: dueInfo.isOverdue ? '#EF4444' : 'var(--color-text-muted)',
                                                fontWeight: dueInfo.isOverdue ? 600 : 400,
                                                fontSize: 'var(--font-size-sm)',
                                            }}>
                                                {dueInfo.text}
                                            </span>
                                        )}
                                    </div>
                                    {item.lent_notes && (
                                        <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                            "{item.lent_notes}"
                                        </div>
                                    )}
                                </div>

                                <button
                                    className="btn"
                                    style={{
                                        background: dueInfo?.isOverdue ? '#EF4444' : '#8B5CF6',
                                        color: '#fff', border: 'none', fontWeight: 600, flexShrink: 0,
                                    }}
                                    onClick={() => handleReturnLoan(item.id)}
                                >
                                    <RotateCcw size={14} />
                                    Return
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default LentItems;
