import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    TrendingDown, DollarSign, Shirt, AlertTriangle
} from 'lucide-react';
import api from '../services/api';

function StatCard({ icon: Icon, value, label, color }) {
    return (
        <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} style={{ color }} />
                </div>
                <span className="stat-value">{value}</span>
            </div>
            <span className="stat-label">{label}</span>
        </div>
    );
}

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
            <div className="empty-state" style={{ height: '50vh' }}>
                <div className="thinking-spinner" style={{ width: 40, height: 40, marginBottom: 'var(--space-md)' }} />
                <p className="empty-state-text">Loading analytics...</p>
            </div>
        );
    }

    // Take top 10 most expensive per wear items for the chart
    const chartData = data?.items?.slice(0, 10) || [];
    const mostWornItem = data?.items && data.items.length > 0
        ? [...data.items].sort((a, b) => b.wear_count - a.wear_count)[0]
        : null;

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                    Wardrobe Analytics
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    Track your cost-per-wear value and discover items to declutter.
                </p>
            </div>

            {/* Top Value Cards */}
            <div className="grid grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
                <StatCard
                    icon={DollarSign}
                    value={`${currencyOptions}${data?.total_wardrobe_value?.toLocaleString() || '0'}`}
                    label={`Across ${data?.items_analyzed || 0} priced items`}
                    color="var(--color-success)"
                />

                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: `var(--color-info)20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={24} style={{ color: 'var(--color-info)' }} />
                        </div>
                    </div>
                    {mostWornItem ? (
                        <div style={{ marginTop: 'var(--space-sm)' }}>
                            <span className="stat-value" style={{ fontSize: 'var(--font-size-xl)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                {mostWornItem.name}
                            </span>
                            <span className="stat-label">Cost per wear: {currencyOptions}{mostWornItem.cost_per_wear}</span>
                        </div>
                    ) : (
                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <span className="stat-label">No data yet</span>
                        </div>
                    )}
                </div>

                <StatCard
                    icon={AlertTriangle}
                    value={declutter?.suggested_declutter_count || 0}
                    label="Unworn in over 365 days"
                    color="var(--color-error)"
                />
            </div>

            {/* Cost Per Wear Chart */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card-header" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Shirt size={20} style={{ color: 'var(--color-info)' }} />
                        Worst Value Items (Highest Cost-Per-Wear)
                    </h3>
                </div>

                {chartData.length > 0 ? (
                    <div style={{ width: '100%', height: 320 }}>
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
                                    cursor={{ fill: 'var(--color-border-hover)' }}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
                                    itemStyle={{ color: 'var(--color-text-primary)' }}
                                    formatter={(value) => [`${currencyOptions}${value}`, 'Cost Per Wear']}
                                />
                                <Bar dataKey="cost_per_wear" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? 'var(--color-error)' : 'var(--color-accent-primary)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="empty-state">
                        <Shirt size={48} className="empty-state-icon" style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                        <p className="empty-state-text" style={{ maxWidth: 400 }}>
                            Add purchase prices to your items and log when you wear them to see your cost-per-wear analytics.
                        </p>
                    </div>
                )}
            </div>

            {/* Declutter List */}
            {declutter?.items && declutter.items.length > 0 && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 'var(--space-lg)' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
                            Suggested Declutter List
                        </h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                        {declutter.items.map(item => (
                            <div key={item.id} style={{
                                background: 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    aspectRatio: '1',
                                    background: 'var(--color-bg-elevated)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Shirt size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                                    )}
                                </div>
                                <div style={{ padding: 'var(--space-md)' }}>
                                    <p style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginTop: 4 }}>
                                        Unworn 1+ year
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
