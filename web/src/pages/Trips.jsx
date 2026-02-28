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
        return <div className="p-8"><div className="animate-spin text-3xl">✈️</div></div>;
    }

    const activeTrips = trips.filter(t => t.is_active);
    const pastTrips = trips.filter(t => !t.is_active);

    return (
        <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-fade-in pb-24">

            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Trips & Packing</h1>
                    <p className="text-[var(--color-text-muted)] mt-2">
                        Organize physical items into temporary packing lists for travel.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2 px-6 py-3"
                >
                    <Plus size={18} /> Plan a Trip
                </button>
            </header>

            {/* Active Trips list */}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2 mb-4">
                <Plane className="text-indigo-400" /> Currently Planning ({activeTrips.length})
            </h2>

            {activeTrips.length === 0 ? (
                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-12 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-4">
                    <Briefcase size={48} className="opacity-20" />
                    <p>No active trips planned right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {activeTrips.map(trip => (
                        <div key={trip.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)] flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{trip.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mt-1">
                                        <MapPin size={14} /> {trip.destination}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mt-1">
                                        <Calendar size={14} />
                                        {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Active
                                </div>
                            </div>

                            <div className="p-5 flex-1 bg-[var(--color-bg-primary)]">
                                <h4 className="text-sm font-semibold uppercase text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                                    <Package size={14} /> Packed Items ({trip.items?.length || 0})
                                </h4>
                                {trip.items && trip.items.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {trip.items.map(item => (
                                            <div key={item.id} className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" className="w-5 h-5 rounded object-cover" />
                                                ) : (
                                                    <span className="opacity-50">📦</span>
                                                )}
                                                <span className="truncate max-w-[120px]">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--color-text-muted)] italic mb-4">No items packed yet. Go to an item and select "Pack for Trip".</p>
                                )}
                            </div>

                            <div className="p-3 bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)] flex justify-end">
                                <button
                                    onClick={() => handleUnpackAll(trip.id)}
                                    className="text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
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
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2 mb-4 opacity-70">
                        <Calendar className="text-gray-400" /> Past Trips ({pastTrips.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {pastTrips.map(trip => (
                            <div key={trip.id} className="bg-[var(--color-bg-tertiary)] opacity-60 rounded-xl p-4 border border-[var(--color-border)]">
                                <h3 className="font-bold text-[var(--color-text-primary)]">{trip.name}</h3>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">{trip.destination}</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">{new Date(trip.end_date).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Overlay */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-spring-up">
                        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-tertiary)]">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                <Plane className="text-indigo-400" /> New Trip
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Trip Name/Event</label>
                                <input required autoFocus placeholder="e.g. Summer Vacation, Ski Trip" value={newTrip.name} onChange={e => setNewTrip({ ...newTrip, name: e.target.value })} className="form-input w-full bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Destination</label>
                                <input required placeholder="e.g. Hawaii, Denver CO" value={newTrip.destination} onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })} className="form-input w-full bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Start Date</label>
                                    <input required type="date" value={newTrip.start_date} onChange={e => setNewTrip({ ...newTrip, start_date: e.target.value })} className="form-input w-full bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1">End Date</label>
                                    <input required type="date" value={newTrip.end_date} onChange={e => setNewTrip({ ...newTrip, end_date: e.target.value })} className="form-input w-full bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[var(--color-border)] flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
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
