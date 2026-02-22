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

        // Create a new AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const res = await chatApi.send(msg, conversationId, controller.signal);
            const data = res.data;
            if (!conversationId) setConversationId(data.conversation_id);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                actions: data.actions || [],
                thinking: data.thinking || '',
            }]);

            // Refresh conversations list
            loadConversations();
        } catch (err) {
            // Don't show an error if the user intentionally stopped the request
            const isCancelled = err?.code === 'ERR_CANCELED' || err?.name === 'AbortError' || err?.name === 'CanceledError';
            if (isCancelled) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⏹️ Stopped.',
                    actions: [],
                    thinking: '',
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '❌ Failed to get response. Is the server running?',
                    actions: [],
                    thinking: '',
                }]);
            }
        } finally {
            abortControllerRef.current = null;
            setLoading(false);
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
            // Map backend messages to frontend format (only user/assistant)
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
