import { createContext, useState, useEffect, useContext } from 'react';
import { chatApi } from '../services/api';

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [isDrawerOpen, setDrawerOpen] = useState(false);

    const handleSend = async (textOverride = null) => {
        const msg = (textOverride || input).trim();
        if (!msg || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const res = await chatApi.send(msg, conversationId);
            const data = res.data;
            if (!conversationId) setConversationId(data.conversation_id);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                actions: data.actions || [],
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Failed to get response. Is the server running?',
                actions: [],
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        if (conversationId) {
            try { await chatApi.clearHistory(conversationId); } catch { }
        }
        setMessages([]);
        setConversationId(null);
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
                isDrawerOpen,
                setDrawerOpen,
                handleSend,
                handleClear
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);
