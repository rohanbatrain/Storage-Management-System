import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { chatApi } from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    actions?: { tool: string; args: any; summary: string }[];
}

const TOOL_ICONS: Record<string, string> = {
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

const SUGGESTIONS = [
    "Where's my blue shirt?",
    "What's in the laundry?",
    "Show wardrobe stats",
    "What have I lent out?",
];

export default function ChatScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const handleSend = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const res = await chatApi.send(msg, conversationId || undefined);
            const data = res.data;
            if (!conversationId) setConversationId(data.conversation_id);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                actions: data.actions || [],
            }]);
        } catch {
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

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={handleClear} style={{ marginRight: spacing.md }}>
                    <Text style={{ color: colors.textMuted, fontSize: 14 }}>Clear</Text>
                </TouchableOpacity>
            ),
        });
    }, [conversationId]);

    const renderMessage = ({ item, index }: { item: Message; index: number }) => (
        <View style={[
            styles.msgRow,
            item.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant,
        ]}>
            {/* Tool action chips */}
            {item.actions && item.actions.length > 0 && (
                <View style={styles.actionsRow}>
                    {item.actions.map((a, i) => (
                        <View key={i} style={styles.actionChip}>
                            <Text style={styles.actionChipText}>
                                {TOOL_ICONS[a.tool] || '🔧'} {a.summary}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
            ]}>
                <Text style={[
                    styles.bubbleText,
                    item.role === 'user' && { color: '#fff' },
                ]}>{item.content}</Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={globalStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
        >
            {messages.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 48 }}>🧠</Text>
                    <Text style={styles.emptyTitle}>Ask SMS</Text>
                    <Text style={styles.emptySubtitle}>
                        Ask about your items, laundry, wardrobe — anything!
                    </Text>
                    <View style={styles.suggestions}>
                        {SUGGESTIONS.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.suggestionChip}
                                onPress={() => handleSend(s)}
                            >
                                <Text style={styles.suggestionText}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(_, i) => String(i)}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            {loading && (
                <View style={styles.typingRow}>
                    <ActivityIndicator size="small" color={colors.accentPrimary} />
                    <Text style={styles.typingText}>Thinking...</Text>
                </View>
            )}

            {/* Input */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask about your stuff..."
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="send"
                    onSubmitEditing={() => handleSend()}
                    editable={!loading}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!input.trim() || loading) && { opacity: 0.4 }]}
                    onPress={() => handleSend()}
                    disabled={!input.trim() || loading}
                >
                    <Text style={styles.sendIcon}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    messageList: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },
    msgRow: {
        marginBottom: spacing.sm,
    },
    msgRowUser: {
        alignItems: 'flex-end',
    },
    msgRowAssistant: {
        alignItems: 'flex-start',
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 4,
        maxWidth: '85%',
    },
    actionChip: {
        backgroundColor: colors.bgElevated,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 6,
    },
    actionChipText: {
        fontSize: 10,
        color: colors.textMuted,
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: 16,
    },
    bubbleUser: {
        backgroundColor: colors.accentPrimary,
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        backgroundColor: colors.bgTertiary,
        borderBottomLeftRadius: 4,
    },
    bubbleText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textPrimary,
    },
    typingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    typingText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    input: {
        flex: 1,
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        color: colors.textPrimary,
        fontSize: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accentPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendIcon: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    // Empty state
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    suggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    suggestionChip: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
});
