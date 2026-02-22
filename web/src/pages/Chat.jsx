import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Brain, Plus, MessageSquare, ChevronDown, ChevronRight, Clock, Zap } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

const parseReply = (content) => {
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
    move_item: '🚚',
    wear_item: '👔',
    wash_item: '🫧',
};

const TOOL_LABELS = {
    search_items: 'Search Items',
    list_laundry: 'List Laundry',
    list_rewearable: 'Check Rewearable',
    list_lent_items: 'List Lent Items',
    list_lost_items: 'List Lost Items',
    get_wardrobe_stats: 'Wardrobe Stats',
    list_locations: 'List Locations',
    list_all_items: 'List All Items',
    get_item_details: 'Get Item Details',
    move_item: 'Move Item',
    wear_item: 'Log Wear',
    wash_item: 'Mark Washed',
};

function formatArgs(args) {
    if (!args || Object.keys(args).length === 0) return null;
    return Object.entries(args)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('  ·  ');
}

function ToolCallBlock({ action, index }) {
    const [expanded, setExpanded] = useState(false);
    const icon = TOOL_ICONS[action.tool] || '🔧';
    const label = TOOL_LABELS[action.tool] || action.tool;
    const argStr = formatArgs(action.args);
    const isError = action.summary?.startsWith('❌');

    return (
        <div style={{
            marginBottom: '6px',
            marginLeft: '4px',
            borderRadius: '10px',
            border: `1px solid ${isError ? 'rgba(239,68,68,0.25)' : 'rgba(6,182,212,0.2)'}`,
            background: isError ? 'rgba(239,68,68,0.05)' : 'rgba(6,182,212,0.04)',
            overflow: 'hidden',
        }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <Zap size={12} style={{ color: isError ? '#ef4444' : '#06b6d4', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isError ? '#ef4444' : '#06b6d4' }}>
                    {icon} {label}
                </span>
                {argStr && !expanded && (
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                    }}>
                        — {argStr}
                    </span>
                )}
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                    {action.summary}
                </span>
                {expanded
                    ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                }
            </button>
            {expanded && argStr && (
                <div style={{
                    padding: '4px 12px 10px 32px',
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'monospace',
                    borderTop: '1px solid var(--color-border)',
                }}>
                    {Object.entries(action.args).map(([k, v]) => (
                        <div key={k}>
                            <span style={{ color: '#06b6d4' }}>{k}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}> = </span>
                            <span style={{ color: 'var(--color-text-primary)' }}>{JSON.stringify(v)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ThinkingBlock({ thinking }) {
    const [expanded, setExpanded] = useState(false);
    if (!thinking) return null;

    return (
        <div style={{
            marginBottom: '0.5rem',
            marginLeft: '1rem',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            background: 'rgba(139, 92, 246, 0.05)',
            overflow: 'hidden',
        }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                }}
            >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Brain size={14} style={{ color: '#8b5cf6' }} />
                <span>Thinking</span>
            </button>
            {expanded && (
                <div style={{
                    padding: '0 12px 10px',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6,
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '300px',
                    overflowY: 'auto',
                }}>
                    {thinking}
                </div>
            )}
        </div>
    );
}

function ConversationItem({ conv, isActive, onSelect, onDelete }) {
    const [hovering, setHovering] = useState(false);
    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div
            onClick={() => onSelect(conv.id)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            style={{
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : hovering ? 'var(--color-bg-tertiary)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}
        >
            <MessageSquare size={14} style={{ color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {conv.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Clock size={10} />
                    {timeAgo(conv.updated_at)}
                    <span style={{ margin: '0 2px' }}>·</span>
                    {conv.message_count} msgs
                </div>
            </div>
            {hovering && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        flexShrink: 0,
                    }}
                    title="Delete conversation"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
}

function Chat() {
    const {
        messages,
        input,
        setInput,
        loading,
        conversationId,
        conversations,
        handleSend,
        handleClear,
        newConversation,
        switchConversation,
        deleteConversation,
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

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            {/* Conversation Sidebar */}
            <div style={{
                width: 260,
                background: 'var(--color-bg-secondary)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
            }}>
                {/* New Chat Button */}
                <div style={{ padding: '16px 12px 8px' }}>
                    <button
                        onClick={newConversation}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                            e.currentTarget.style.color = 'var(--color-accent-primary)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                    >
                        <Plus size={16} />
                        New Chat
                    </button>
                </div>

                {/* Conversations List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
                    {conversations.length === 0 ? (
                        <div style={{
                            padding: '2rem 1rem',
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.8rem',
                        }}>
                            <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <div>No conversations yet</div>
                            <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>
                                Start chatting to create one
                            </div>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <ConversationItem
                                key={conv.id}
                                conv={conv}
                                isActive={conv.id === conversationId}
                                onSelect={switchConversation}
                                onDelete={deleteConversation}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
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

                {/* Messages */}
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
                                        {/* Thinking Block */}
                                        {m.role === 'assistant' && m.thinking && (
                                            <ThinkingBlock thinking={m.thinking} />
                                        )}

                                        {/* Tool Calls */}
                                        {m.actions && m.actions.length > 0 && (
                                            <div style={{ marginBottom: '0.5rem', marginLeft: '4px', width: '100%', maxWidth: '85%' }}>
                                                {m.actions.map((a, j) => (
                                                    <ToolCallBlock key={j} action={a} index={j} />
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
            </div>

            <style>{`
                .typing-dot {
                    animation: bounce 1.4s infinite ease-in-out both;
                }
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-4px); }
                }
            `}
            </style>
        </div>
    );
}

export default Chat;
