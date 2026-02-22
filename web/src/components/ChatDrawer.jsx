import { useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Maximize2, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';

function ChatDrawer() {
    const navigate = useNavigate();
    const {
        messages,
        input,
        setInput,
        loading,
        isDrawerOpen: open,
        setDrawerOpen: setOpen,
        handleSend: contextHandleSend,
        handleStop,
        handleClear
    } = useChat();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        contextHandleSend();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Extract item/location IDs from the reply for clickable links
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

    const toolIcons = {
        search_items: '🔍',
        list_laundry: '🧺',
        list_rewearable: '👕',
        list_lent_items: '🤝',
        list_lost_items: '❓',
        get_wardrobe_stats: '📊',
        list_locations: '📍',
        list_all_items: '📦',
        get_item_details: '📋',
        move_item: '📦→',
        wear_item: '👔',
        wash_item: '🫧',
    };

    return (
        <>
            {/* FAB */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    style={{
                        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
                        width: 56, height: 56, borderRadius: 28,
                        background: 'var(--color-accent-primary)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                >
                    <MessageCircle size={24} color="#fff" />
                </button>
            )}

            {/* Drawer */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
                    width: 400, maxWidth: 'calc(100vw - 48px)',
                    height: 560, maxHeight: 'calc(100vh - 100px)',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg-tertiary)',
                    }}>
                        <span style={{ fontSize: 20 }}>💬</span>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                            Ask SMS
                        </span>
                        <button onClick={handleClear} style={iconBtn} title="Clear chat">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={() => { setOpen(false); navigate('/chat'); }} style={iconBtn} title="Expand to full page">
                            <Maximize2 size={14} />
                        </button>
                        <button onClick={() => setOpen(false)} style={iconBtn} title="Close">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '0.75rem',
                        display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    }}>
                        {messages.length === 0 && (
                            <div style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem',
                            }}>
                                <span style={{ fontSize: 40 }}>🧠</span>
                                <span style={{ fontWeight: 600 }}>Ask me anything</span>
                                <span style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    "Where's my blue shirt?"<br />
                                    "What's in the laundry?"<br />
                                    "Show me wardrobe stats"
                                </span>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                            }}>
                                {/* Tool action chips */}
                                {msg.actions?.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                                        {msg.actions.map((a, i) => (
                                            <span key={i} style={{
                                                fontSize: '0.65rem', padding: '2px 6px',
                                                borderRadius: 6, background: 'var(--color-bg-elevated)',
                                                color: 'var(--color-text-muted)',
                                            }}>
                                                {toolIcons[a.tool] || '🔧'} {a.summary}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div style={{
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: msg.role === 'user'
                                        ? '12px 12px 4px 12px'
                                        : '12px 12px 12px 4px',
                                    background: msg.role === 'user'
                                        ? 'var(--color-accent-primary)'
                                        : 'var(--color-bg-tertiary)',
                                    color: msg.role === 'user'
                                        ? '#fff'
                                        : 'var(--color-text-primary)',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                }}>
                                    {msg.role === 'user' ? msg.content : parseReply(msg.content)}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div style={{
                                alignSelf: 'flex-start', padding: '0.5rem 0.75rem',
                                borderRadius: '12px 12px 12px 4px',
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-muted)', fontSize: '0.85rem',
                            }}>
                                <span className="typing-dots">Thinking...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        display: 'flex', gap: '0.5rem', padding: '0.75rem',
                        borderTop: '1px solid var(--color-border)',
                        background: 'var(--color-bg-tertiary)',
                    }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your stuff..."
                            disabled={loading}
                            style={{
                                flex: 1, padding: '0.5rem 0.75rem',
                                borderRadius: 8, border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-primary)',
                                color: 'var(--color-text-primary)',
                                fontSize: '0.85rem', outline: 'none',
                            }}
                        />
                        <button
                            onClick={loading ? handleStop : handleSend}
                            disabled={!loading && !input.trim()}
                            title={loading ? 'Stop response' : 'Send'}
                            style={{
                                padding: '0.5rem 0.75rem', borderRadius: 8,
                                border: 'none',
                                background: loading ? '#ef4444' : 'var(--color-accent-primary)',
                                color: '#fff', cursor: 'pointer',
                                opacity: (!loading && !input.trim()) ? 0.4 : 1,
                                display: 'flex', alignItems: 'center',
                                transition: 'background 0.2s',
                            }}
                        >
                            {loading ? <Square size={14} fill="#fff" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

const iconBtn = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--color-text-muted)', padding: 4,
    borderRadius: 6, display: 'flex', alignItems: 'center',
};

export default ChatDrawer;
