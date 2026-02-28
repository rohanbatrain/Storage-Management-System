import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    TrendingDown, DollarSign, Shirt, AlertTriangle
} from 'lucide-react';
import api from '../services/api';

export default function Analytics() {
    const [data, setData] = useState(null);
    const [declutter, setDeclutter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currencyOptions, setCurrencyOptions] = useState(
        localStorage.getItem('sms_currency_preference') || '₹'
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cpwRes, declusterRes] = await Promise.all([
                    api.get('/analytics/cost-per-wear'),
                    api.get('/analytics/declutter?days=365')
                ]);
                setData(cpwRes.data);
                setDeclutter(declusterRes.data);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    // Take top 10 most expensive per wear items for the chart
    const chartData = data?.items?.slice(0, 10) || [];

    return (
        <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-fade-in pb-24">

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Wardrobe Analytics</h1>
                <p className="text-[var(--color-text-muted)] mt-2">
                    Track your cost-per-wear value and discover items to declutter.
                </p>
            </header>

            {/* Top Value Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 text-[var(--color-text-muted)] mb-2">
                        <DollarSign size={20} className="text-green-500" />
                        <h3 className="font-semibold text-sm uppercase tracking-wider">Total Value Tracking</h3>
                    </div>
                    <p className="text-4xl font-bold text-[var(--color-text-primary)]">
                        {currencyOptions}{data?.total_wardrobe_value?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-2">
                        Across {data?.items_analyzed || 0} priced items
                    </p>
                </div>

                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 text-[var(--color-text-muted)] mb-2">
                        <TrendingDown size={20} className="text-indigo-400" />
                        <h3 className="font-semibold text-sm uppercase tracking-wider">Most Worn Item</h3>
                    </div>
                    {data?.items && data.items.length > 0 ? (
                        <>
                            <p className="text-2xl font-bold text-[var(--color-text-primary)] truncate">
                                {/* Find the item with most wears */}
                                {[...data.items].sort((a, b) => b.wear_count - a.wear_count)[0].name}
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)] mt-2">
                                Cost per wear: {currencyOptions}{[...data.items].sort((a, b) => b.wear_count - a.wear_count)[0].cost_per_wear}
                            </p>
                        </>
                    ) : (
                        <p className="text-xl text-[var(--color-text-muted)]">No data yet</p>
                    )}
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 text-red-400 mb-2">
                        <AlertTriangle size={20} />
                        <h3 className="font-semibold text-sm uppercase tracking-wider">Declutter Targets</h3>
                    </div>
                    <p className="text-4xl font-bold text-red-500">
                        {declutter?.suggested_declutter_count || 0}
                    </p>
                    <p className="text-sm text-red-400/80 mt-2">
                        Unworn in over 365 days
                    </p>
                </div>
            </div>

            {/* Cost Per Wear Chart */}
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
                    <Shirt size={20} className="text-indigo-400" />
                    Worst Value Items (Highest Cost-Per-Wear)
                </h2>

                {chartData.length > 0 ? (
                    <div className="w-full h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                    angle={-45}
                                    textAnchor="end"
                                />
                                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(val) => `${currencyOptions}${val}`} />
                                <Tooltip
                                    cursor={{ fill: 'var(--color-bg-hover)' }}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                                    formatter={(value) => [`${currencyOptions}${value}`, 'Cost Per Wear']}
                                />
                                <Bar dataKey="cost_per_wear" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? '#ef4444' : '#6366f1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="py-12 flex flex-col items-center text-center">
                        <div className="text-4xl mb-4 opacity-50">🧥</div>
                        <p className="text-[var(--color-text-muted)] max-w-sm">
                            Add purchase prices to your items and log when you wear them to see your cost-per-wear analytics.
                        </p>
                    </div>
                )}
            </div>

            {/* Declutter List */}
            {declutter?.items && declutter.items.length > 0 && (
                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-400" />
                        Suggested Declutter List
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {declutter.items.map(item => (
                            <div key={item.id} className="bg-[var(--color-bg-tertiary)] rounded-xl overflow-hidden border border-[var(--color-border)] group">
                                <div className="aspect-square bg-[var(--color-bg-elevated)] flex items-center justify-center">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Shirt size={40} className="text-[var(--color-text-muted)] opacity-50" />
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="font-medium text-[var(--color-text-primary)] text-sm truncate">{item.name}</p>
                                    <p className="text-xs text-red-400 mt-1">Unworn 1+ year</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
