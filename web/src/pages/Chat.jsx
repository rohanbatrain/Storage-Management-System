import { useRef, useEffect } from 'react';
import { Send, Trash2, Brain } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

const parseReply = (content) => {
    // Simple markdown-like rendering: bold, newlines
    return content
        .split('\n')
        .map((line, i) => (
            <span key={i}>
                {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
                {i < content.split('\n').length - 1 && <br />}
            </span>
        ));
};

const SUGGESTIONS = [
    "Where's my blue shirt?",
    "What's in the laundry?",
    "Show me wardrobe stats",
    "What have I lent out?",
];

const TOOL_ICONS = {
    search_items: '🔍',
    list_laundry: '🧺',
    list_rewearable: '👕',
    list_lent_items: '🤝',
    list_lost_items: '❓',
    get_wardrobe_stats: '📊',
    list_locations: '📍',
    list_all_items: '📦',
    get_item_details: '📋',
    move_item: '📦',
    wear_item: '👔',
    wash_item: '🫧',
};

function Chat() {
    const {
        messages,
        input,
        setInput,
        loading,
        handleSend,
        handleClear
    } = useChat();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <div style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', flexShrink: 0 }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Brain className="text-accent" /> Ask SMS
                    </h1>
                    <p className="page-subtitle" style={{ margin: 0, marginTop: '4px' }}>Natural language assistant for your storage</p>
                </div>
                {messages.length > 0 && (
                    <button onClick={handleClear} className="btn btn-secondary" title="Clear conversation">
                        <Trash2 size={16} /> Clear Chat
                    </button>
                )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-bg-primary)' }}>
                {messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                                <Brain size={40} className="text-accent" />
                            </div>
                            <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>How can I help you today?</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '600px' }}>
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    style={{
                                        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-secondary)', padding: '0.75rem 1.25rem',
                                        borderRadius: '2rem', cursor: 'pointer', fontSize: '0.9rem',
                                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; e.currentTarget.style.color = 'var(--color-accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {messages.map((m, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    {/* Tool actions */}
                                    {m.actions && m.actions.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem', marginLeft: m.role === 'assistant' ? '1rem' : 0 }}>
                                            {m.actions.map((a, j) => (
                                                <div key={j} style={{
                                                    fontSize: '0.75rem', background: 'var(--color-bg-tertiary)',
                                                    color: 'var(--color-text-muted)', padding: '4px 10px', borderRadius: '12px',
                                                    border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '4px'
                                                }}>
                                                    <span>{TOOL_ICONS[a.tool] || '🔧'}</span> <span>{a.summary}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Message Bubble */}
                                    <div style={{
                                        background: m.role === 'user' ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                                        color: m.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                                        padding: '1rem 1.25rem',
                                        borderRadius: '1.5rem',
                                        borderBottomRightRadius: m.role === 'user' ? '0.5rem' : '1.5rem',
                                        borderBottomLeftRadius: m.role === 'assistant' ? '0.5rem' : '1.5rem',
                                        lineHeight: 1.6,
                                        fontSize: '1rem',
                                        maxWidth: '85%',
                                        boxShadow: m.role === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
                                        border: m.role === 'assistant' ? '1px solid var(--color-border)' : 'none'
                                    }}>
                                        {parseReply(m.content)}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div style={{ alignSelf: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '1.5rem', borderBottomLeftRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                                    <div className="typing-dot" style={{ animationDelay: '0ms' }}>•</div>
                                    <div className="typing-dot" style={{ animationDelay: '150ms' }}>•</div>
                                    <div className="typing-dot" style={{ animationDelay: '300ms' }}>•</div>
                                    <span style={{ marginLeft: '4px' }}>Thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div style={{ padding: '1.5rem 2rem', background: 'var(--color-bg-primary)', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--color-border)' }}>
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '800px', position: 'relative' }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask SMS about your belongings..."
                            disabled={loading}
                            style={{
                                flex: 1, padding: '1rem 1.5rem', paddingRight: '4rem', borderRadius: '2rem',
                                border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)', outline: 'none', fontSize: '1rem',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--color-accent-primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            style={{
                                position: 'absolute', right: '0.5rem', top: '0.5rem',
                                background: 'var(--color-accent-primary)', color: '#fff', border: 'none',
                                borderRadius: '1.5rem', width: '2.5rem', height: '2.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                                opacity: (!input.trim() || loading) ? 0.5 : 1, transition: 'all 0.2s',
                            }}
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                .typing-dot {
                    animation: bounce 1.4s infinite ease-in-out both;
                }
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-4px); }
                }
            `}</style>
        </div>
    );
}

export default Chat;
