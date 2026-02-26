import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Brain, Plus, MessageSquare, ChevronDown, ChevronRight, Clock, Zap, Square, History, X, RefreshCw, Cpu } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { chatApi } from '../services/api';

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
    const isRunning = action.status === 'running';

    return (
        <div style={{
            marginBottom: '6px',
            marginLeft: '4px',
            borderRadius: '10px',
            border: `1px solid ${isError ? 'rgba(239,68,68,0.25)' : isRunning ? 'rgba(99,102,241,0.3)' : 'rgba(6,182,212,0.2)'}`,
            background: isError ? 'rgba(239,68,68,0.05)' : isRunning ? 'rgba(99,102,241,0.06)' : 'rgba(6,182,212,0.04)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
        }}>
            <button
                onClick={() => !isRunning && setExpanded(!expanded)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: isRunning ? 'default' : 'pointer',
                    textAlign: 'left',
                }}
            >
                {isRunning ? (
                    <span className="tool-pulse" style={{ width: 12, height: 12, borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0 }} />
                ) : (
                    <Zap size={12} style={{ color: isError ? '#ef4444' : '#06b6d4', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isRunning ? '#6366f1' : isError ? '#ef4444' : '#06b6d4' }}>
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
                    {isRunning ? 'Running...' : action.summary}
                </span>
                {!isRunning && (expanded
                    ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                )}
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

function ThinkingBlock({ thinking, streaming }) {
    const [expanded, setExpanded] = useState(false);
    if (!thinking) return null;

    // Auto-expand while streaming thinking
    const isOpen = streaming || expanded;

    return (
        <div style={{
            marginBottom: '0.5rem',
            marginLeft: '1rem',
            borderRadius: '12px',
            border: `1px solid ${streaming ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.2)'}`,
            background: streaming ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
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
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {streaming ? (
                    <span className="tool-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block', flexShrink: 0 }} />
                ) : (
                    <Brain size={14} style={{ color: '#8b5cf6' }} />
                )}
                <span>{streaming ? 'Thinking...' : 'Thinking'}</span>
            </button>
            {isOpen && (
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
                    {streaming && <span className="streaming-cursor">▊</span>}
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
        handleStop,
        handleClear,
        newConversation,
        switchConversation,
        deleteConversation,
        loadConversations,
    } = useChat();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [installedModels, setInstalledModels] = useState([]);
    const [activeModel, setActiveModel] = useState('');
    const [showModelPicker, setShowModelPicker] = useState(false);
    const modelPickerRef = useRef(null);

    const loadModels = async () => {
        try {
            const res = await chatApi.ollamaModels();
            setInstalledModels(res.data.models || []);
            setActiveModel(res.data.active || '');
        } catch (err) {
            console.log('Could not load Ollama models:', err);
        }
    };

    const handleModelSwitch = async (modelId) => {
        try {
            await chatApi.switchModel(modelId);
            setActiveModel(modelId);
            setShowModelPicker(false);
        } catch (err) {
            console.error('Model switch failed:', err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        inputRef.current?.focus();
        loadModels();
    }, []);

    // Close model picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
                setShowModelPicker(false);
            }
        };
        if (showModelPicker) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showModelPicker]);

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                {/* Header */}
                <div style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Brain className="text-accent" /> Ask SMS
                            </h1>
                            <p className="page-subtitle" style={{ margin: 0, marginTop: '4px' }}>Natural language assistant for your storage</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {messages.length > 0 && (
                            <button onClick={handleClear} className="btn btn-secondary" title="Clear conversation">
                                <Trash2 size={16} /> <span className="hide-mobile">Clear Chat</span>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                newConversation();
                                setIsHistoryOpen(false);
                            }}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={16} /> <span className="hide-mobile">New Chat</span>
                        </button>
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className="btn btn-secondary"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: isHistoryOpen ? 'var(--color-bg-tertiary)' : undefined
                            }}
                        >
                            <History size={16} /> <span className="hide-mobile">History</span>
                        </button>
                    </div>
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
                                            <ThinkingBlock thinking={m.thinking} streaming={m.streaming && !m.content} />
                                        )}

                                        {/* Tool Calls — show all including running */}
                                        {m.actions && m.actions.length > 0 && (
                                            <div style={{ marginBottom: '0.5rem', marginLeft: '4px', width: '100%', maxWidth: '85%' }}>
                                                {m.actions
                                                    .filter(a => !a.summary?.startsWith('❌'))
                                                    .map((a, j) => (
                                                        <ToolCallBlock key={j} action={a} index={j} />
                                                    ))}
                                            </div>
                                        )}

                                        {/* Message Bubble */}
                                        {(m.content || !m.streaming) && (
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
                                                {m.streaming && <span className="streaming-cursor">▊</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && messages.length > 0 && messages[messages.length - 1]?.streaming && !messages[messages.length - 1]?.content && messages[messages.length - 1]?.actions?.length === 0 && (
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
                    <div style={{ padding: '1rem 2rem', background: 'var(--color-bg-primary)', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--color-border)' }}>
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '800px', alignItems: 'center' }}
                        >
                            {/* Model Selector - left of input */}
                            {installedModels.length > 0 && (
                                <div ref={modelPickerRef} style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModelPicker(!showModelPicker)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            padding: '8px 10px', borderRadius: '1.5rem',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-bg-secondary)',
                                            color: 'var(--color-text-muted)',
                                            fontSize: '0.75rem', fontWeight: 500,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            whiteSpace: 'nowrap', height: '3.5rem',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; e.currentTarget.style.color = 'var(--color-accent-primary)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                    >
                                        <Cpu size={13} />
                                        <span className="hide-mobile">{(activeModel || 'model').split(':')[0]}</span>
                                        <ChevronDown size={11} />
                                    </button>
                                    {showModelPicker && (
                                        <div style={{
                                            position: 'absolute', bottom: '100%', left: 0, marginBottom: '6px',
                                            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                                            borderRadius: '12px', boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
                                            zIndex: 100, minWidth: '240px', overflow: 'hidden',
                                        }}>
                                            <div style={{ padding: '8px 12px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
                                                Switch Model
                                            </div>
                                            {installedModels.map(m => (
                                                <button
                                                    type="button"
                                                    key={m.id}
                                                    onClick={() => handleModelSwitch(m.id)}
                                                    style={{
                                                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '10px 12px', border: 'none', cursor: 'pointer',
                                                        background: m.id === activeModel ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                        borderBottom: '1px solid var(--color-border)',
                                                        textAlign: 'left', transition: 'background 0.1s',
                                                    }}
                                                    onMouseEnter={e => { if (m.id !== activeModel) e.currentTarget.style.background = 'var(--color-bg-tertiary)'; }}
                                                    onMouseLeave={e => { if (m.id !== activeModel) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: m.id === activeModel ? 600 : 500, color: m.id === activeModel ? 'var(--color-accent-primary)' : 'var(--color-text-primary)' }}>
                                                            {m.id}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{m.size_gb} GB</div>
                                                    </div>
                                                    {m.id === activeModel && (
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#22c55e', background: '#22c55e20', padding: '2px 8px', borderRadius: 8 }}>Active</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask SMS about your belongings..."
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '1rem 1.5rem', paddingRight: '3.5rem', borderRadius: '2rem',
                                        border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                                        color: 'var(--color-text-primary)', outline: 'none', fontSize: '1rem',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-accent-primary)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                                />
                                <button
                                    type={loading ? 'button' : 'submit'}
                                    onClick={loading ? handleStop : undefined}
                                    disabled={!loading && !input.trim()}
                                    title={loading ? 'Stop response' : 'Send message'}
                                    style={{
                                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                        background: loading ? '#ef4444' : 'var(--color-accent-primary)',
                                        color: '#fff', border: 'none',
                                        borderRadius: '1.5rem', width: '2.5rem', height: '2.5rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: (!loading && !input.trim()) ? 'not-allowed' : 'pointer',
                                        opacity: (!loading && !input.trim()) ? 0.5 : 1,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {loading ? <Square size={14} fill="#fff" /> : <Send size={16} />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* History Overlay Drawer */}
            {isHistoryOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.2)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 40,
                        opacity: isHistoryOpen ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                    }}
                    onClick={() => setIsHistoryOpen(false)}
                />
            )}

            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 320,
                height: '100%',
                background: 'var(--color-bg-primary)',
                borderLeft: '1px solid var(--color-border)',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                transform: isHistoryOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 50,
            }}>
                <div style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--color-bg-secondary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={18} className="text-accent" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Chat History</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={loadConversations}
                            title="Refresh History"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                        >
                            <RefreshCw size={16} />
                        </button>
                        <button
                            onClick={() => setIsHistoryOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {conversations.length === 0 ? (
                        <div style={{
                            padding: '3rem 1rem',
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            <MessageSquare size={32} style={{ opacity: 0.2 }} />
                            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>No conversations found</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                Your chat history will appear here
                            </div>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <ConversationItem
                                key={conv.id}
                                conv={conv}
                                isActive={conv.id === conversationId}
                                onSelect={(id) => {
                                    switchConversation(id);
                                    if (window.innerWidth < 768) setIsHistoryOpen(false);
                                }}
                                onDelete={deleteConversation}
                            />
                        ))
                    )}
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
