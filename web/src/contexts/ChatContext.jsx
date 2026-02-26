import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { chatApi } from '../services/api';

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const abortControllerRef = useRef(null);

    // Load conversation list on mount
    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const res = await chatApi.listConversations();
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const handleSend = async (textOverride = null) => {
        const msg = (textOverride || input).trim();
        if (!msg || loading) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setInput('');
        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        // Add placeholder assistant message (streaming)
        const assistantIdx = messages.length + 1; // index of the new assistant message
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '',
            actions: [],
            thinking: '',
            streaming: true,
        }]);
        setLoading(true);

        try {
            const body = await chatApi.sendStream(msg, conversationId, controller.signal);
            const reader = body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const event = JSON.parse(trimmed);
                        handleStreamEvent(event, assistantIdx);
                    } catch {
                        // skip non-JSON lines
                    }
                }
            }

            // Process any remaining buffer
            if (buffer.trim()) {
                try {
                    const event = JSON.parse(buffer.trim());
                    handleStreamEvent(event, assistantIdx);
                } catch { }
            }
        } catch (err) {
            const isCancelled = err?.name === 'AbortError';
            if (isCancelled) {
                // Mark as stopped
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            content: last.content || '⏹️ Stopped.',
                            streaming: false,
                        };
                    }
                    return updated;
                });
            } else {
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            content: '❌ Failed to get response. Is the server running?',
                            streaming: false,
                        };
                    }
                    return updated;
                });
            }
        } finally {
            abortControllerRef.current = null;
            setLoading(false);
            loadConversations();
        }
    };

    const handleStreamEvent = (event) => {
        switch (event.type) {
            case 'tool_start':
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            actions: [...(last.actions || []), {
                                tool: event.tool,
                                args: event.args,
                                summary: '',
                                status: 'running',
                            }],
                        };
                    }
                    return updated;
                });
                break;

            case 'tool_done':
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        const actions = [...(last.actions || [])];
                        // Find the matching running action and update it
                        const idx = actions.findIndex(a => a.tool === event.tool && a.status === 'running');
                        if (idx >= 0) {
                            actions[idx] = { ...actions[idx], summary: event.summary, status: 'done' };
                        }
                        updated[updated.length - 1] = { ...last, actions };
                    }
                    return updated;
                });
                break;

            case 'token':
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            content: last.content + event.content,
                        };
                    }
                    return updated;
                });
                break;

            case 'done':
                if (event.conversation_id && !conversationId) {
                    setConversationId(event.conversation_id);
                }
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            thinking: event.thinking || '',
                            streaming: false,
                        };
                    }
                    return updated;
                });
                break;

            case 'error':
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            content: `❌ ${event.message}`,
                            streaming: false,
                        };
                    }
                    return updated;
                });
                break;
        }
    };

    const handleClear = async () => {
        if (conversationId) {
            try { await chatApi.clearHistory(conversationId); } catch { }
        }
        setMessages([]);
        setConversationId(null);
        loadConversations();
    };

    const newConversation = () => {
        setMessages([]);
        setConversationId(null);
    };

    const switchConversation = async (id) => {
        try {
            const res = await chatApi.getConversation(id);
            const data = res.data;
            const msgs = (data.messages || [])
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({
                    role: m.role,
                    content: m.content,
                    actions: m.actions || [],
                    thinking: m.thinking || '',
                }));
            setMessages(msgs);
            setConversationId(id);
        } catch (err) {
            console.error('Failed to load conversation:', err);
            setMessages([]);
            setConversationId(null);
            loadConversations();
        }
    };

    const deleteConversation = async (id) => {
        try {
            await chatApi.deleteConversation(id);
            if (conversationId === id) {
                setMessages([]);
                setConversationId(null);
            }
            loadConversations();
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,
                input,
                setInput,
                loading,
                conversationId,
                conversations,
                isDrawerOpen,
                setDrawerOpen,
                handleSend,
                handleStop,
                handleClear,
                newConversation,
                switchConversation,
                deleteConversation,
                loadConversations,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);
