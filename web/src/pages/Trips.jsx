import React, { useState, useEffect } from 'react';
import {
    Plane, Calendar, Plus, MapPin, Package, X, Briefcase
} from 'lucide-react';
import api from '../services/api';

export default function Trips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create state
    const [newTrip, setNewTrip] = useState({
        name: '', destination: '', start_date: '', end_date: '', notes: ''
    });

    const loadTrips = async () => {
        try {
            const res = await api.get('/trips');
            setTrips(res.data);
        } catch (err) {
            console.error("Failed to load trips", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrips();
    }, []);

    const handleCreateTrip = async (e) => {
        e.preventDefault();
        try {
            if (!newTrip.name || !newTrip.destination || !newTrip.start_date || !newTrip.end_date) return;
            await api.post('/trips', {
                name: newTrip.name,
                destination: newTrip.destination,
                start_date: newTrip.start_date,
                end_date: newTrip.end_date,
                notes: newTrip.notes || null,
            });
            setShowCreateModal(false);
            setNewTrip({ name: '', destination: '', start_date: '', end_date: '', notes: '' });
            loadTrips();
        } catch (err) {
            console.error("Failed to create trip", err);
            alert("Error: Failed to create trip");
        }
    };

    const handleUnpackAll = async (tripId) => {
        if (!window.confirm("Are you sure you want to unpack everything from this trip? It will automatically be marked inactive.")) return;
        try {
            await api.post(`/trips/${tripId}/unpack-all`);
            loadTrips();
        } catch (err) {
            alert("Error unpacking trip");
        }
    };

    if (loading) {
        return (
            <div className="empty-state" style={{ height: '50vh' }}>
                <div className="thinking-spinner" style={{ width: 40, height: 40, marginBottom: 'var(--space-md)' }} />
                <p className="empty-state-text">Loading trips...</p>
            </div>
        );
    }

    const activeTrips = trips.filter(t => t.is_active);
    const pastTrips = trips.filter(t => !t.is_active);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                        Trips & Packing
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Organize physical items into temporary packing lists for travel.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                    style={{ padding: 'var(--space-md) var(--space-xl)' }}
                >
                    <Plus size={18} /> Plan a Trip
                </button>
            </div>

            {/* Active Trips list */}
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                <Plane size={24} style={{ color: 'var(--color-accent-primary)' }} /> Currently Planning ({activeTrips.length})
            </h2>

            {activeTrips.length === 0 ? (
                <div className="empty-state card" style={{ padding: 'var(--space-2xl)' }}>
                    <Briefcase size={48} className="empty-state-icon" style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                    <p className="empty-state-text">No active trips planned right now.</p>
                </div>
            ) : (
                <div className="grid grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
                    {activeTrips.map(trip => (
                        <div key={trip.id} className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 4 }}>{trip.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                                        <MapPin size={14} /> {trip.destination}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        <Calendar size={14} />
                                        {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    Active
                                </span>
                            </div>

                            <div style={{ padding: 'var(--space-lg)', flex: 1, backgroundColor: 'var(--color-bg-section)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                    <Package size={14} /> Packed Items ({trip.items?.length || 0})
                                </h4>
                                {trip.items && trip.items.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                        {trip.items.map(item => (
                                            <div key={item.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                                                backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 'var(--font-size-sm)'
                                            }}>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ opacity: 0.5 }}>📦</span>
                                                )}
                                                <span style={{ maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                        No items packed yet. Go to an item and select "Pack for Trip".
                                    </p>
                                )}
                            </div>

                            <div style={{ padding: 'var(--space-md) var(--space-lg)', backgroundColor: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleUnpackAll(trip.id)}
                                    style={{
                                        fontSize: 'var(--font-size-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                                        padding: '8px 16px', borderRadius: 'var(--radius-md)', transition: 'all 0.2s ease',
                                        fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', border: 'none', cursor: 'pointer'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                >
                                    <Package size={14} /> Unpack All & Finish Trip
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Past Trips */}
            {pastTrips.length > 0 && (
                <div style={{ marginTop: 'var(--space-2xl)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)', opacity: 0.7 }}>
                        <Calendar size={24} style={{ color: 'var(--color-text-muted)' }} /> Past Trips ({pastTrips.length})
                    </h2>
                    <div className="grid grid-3">
                        {pastTrips.map(trip => (
                            <div key={trip.id} style={{
                                backgroundColor: 'var(--color-bg-tertiary)', opacity: 0.6, borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-md)', border: '1px solid var(--color-border)'
                            }}>
                                <h3 style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{trip.name}</h3>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{trip.destination}</p>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{new Date(trip.end_date).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Overlay */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <Plane style={{ color: 'var(--color-accent-primary)' }} /> New Trip
                            </h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTrip}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Trip Name/Event</label>
                                    <input required autoFocus placeholder="e.g. Summer Vacation" value={newTrip.name} onChange={e => setNewTrip({ ...newTrip, name: e.target.value })} className="input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Destination</label>
                                    <input required placeholder="e.g. Hawaii, Denver CO" value={newTrip.destination} onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })} className="input" />
                                </div>
                                <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Start Date</label>
                                        <input required type="date" value={newTrip.start_date} onChange={e => setNewTrip({ ...newTrip, start_date: e.target.value })} className="input" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Date</label>
                                        <input required type="date" value={newTrip.end_date} onChange={e => setNewTrip({ ...newTrip, end_date: e.target.value })} className="input" />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Trip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
