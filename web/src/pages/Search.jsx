import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Search as SearchIcon,
    Package,
    Box,
    ChevronRight,
    Loader
} from 'lucide-react';
import { searchApi } from '../services/api';

// Debounce hook for real-time search
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState({ items: [], locations: [], total_count: 0 });
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Debounce the query with 300ms delay for real-time search
    const debouncedQuery = useDebounce(query, 300);

    // Perform search when debounced query changes
    useEffect(() => {
        if (debouncedQuery.trim().length >= 2) {
            performSearch(debouncedQuery);
        } else if (debouncedQuery.trim().length === 0) {
            setResults({ items: [], locations: [], total_count: 0 });
            setHasSearched(false);
        }
    }, [debouncedQuery]);

    // Also search when URL query param changes
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && q !== query) {
            setQuery(q);
        }
    }, [searchParams]);

    const performSearch = async (searchQuery) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await searchApi.search(searchQuery);
            setResults(res.data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newQuery = e.target.value;
        setQuery(newQuery);

        // Update URL params for shareable links (debounced)
        if (newQuery.trim().length >= 2) {
            setSearchParams({ q: newQuery }, { replace: true });
        } else if (newQuery.trim().length === 0) {
            setSearchParams({}, { replace: true });
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                    Search
                </h1>

                <div className="search-box" style={{ maxWidth: '600px', position: 'relative' }}>
                    <SearchIcon size={18} className="search-icon" />
                    <input
                        type="text"
                        className="input"
                        placeholder="Start typing to search..."
                        value={query}
                        onChange={handleInputChange}
                        autoFocus
                        style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--space-md) var(--space-md) var(--space-md) 2.5rem' }}
                    />
                    {loading && (
                        <Loader
                            size={18}
                            style={{
                                position: 'absolute',
                                right: 'var(--space-md)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                animation: 'spin 1s linear infinite',
                                color: 'var(--color-accent-primary)'
                            }}
                        />
                    )}
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>
                    Results appear as you type (minimum 2 characters)
                </p>
            </div>

            {loading && !hasSearched ? (
                <div style={{ color: 'var(--color-text-muted)' }}>Searching...</div>
            ) : results.total_count > 0 ? (
                <div>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        Found {results.total_count} results for "{debouncedQuery}"
                    </p>

                    {results.items.length > 0 && (
                        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                            <div className="card-header">
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Package size={18} />
                                    Items ({results.items.length})
                                </h3>
                            </div>
                            <div className="item-list">
                                {results.items.map(item => (
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
                                                    📍 {item.location_path}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.locations.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Box size={18} />
                                    Locations ({results.locations.length})
                                </h3>
                            </div>
                            <div className="item-list">
                                {results.locations.map(location => (
                                    <div
                                        key={location.id}
                                        className="item-row"
                                        onClick={() => navigate(`/location/${location.id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="item-info">
                                            <Box size={18} style={{ color: 'var(--color-accent-primary)' }} />
                                            <div>
                                                <div className="item-name">{location.name}</div>
                                                <div className="item-location">
                                                    {location.location_path}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : hasSearched && query.length >= 2 ? (
                <div className="empty-state">
                    <SearchIcon size={48} className="empty-state-icon" />
                    <h3 className="empty-state-title">No results found</h3>
                    <p className="empty-state-text">
                        Try a different search term or check your spelling
                    </p>
                </div>
            ) : (
                <div className="empty-state">
                    <SearchIcon size={48} className="empty-state-icon" />
                    <h3 className="empty-state-title">Search for anything</h3>
                    <p className="empty-state-text">
                        Find items and locations by name, description, or alias
                    </p>
                </div>
            )}
        </div>
    );
}

export default Search;
