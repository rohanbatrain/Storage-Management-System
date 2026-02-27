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
    Image,
    Modal,
    Animated,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import api, { chatApi } from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
    actions?: { tool: string; args: any; summary: string }[];
    thinking?: string;
    streaming?: boolean;
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

// Custom Thinking Block Animation
function ThinkingBlock({ thinking, streaming }: { thinking?: string; streaming?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        if (streaming) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [streaming]);

    if (!thinking && !streaming) return null;
    const isOpen = streaming || expanded;

    return (
        <View style={[styles.thinkingContainer, streaming && styles.thinkingContainerActive]}>
            <TouchableOpacity
                style={styles.thinkingHeader}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={[styles.thinkingIconBg, streaming && styles.thinkingIconBgActive]}>
                    {streaming ? (
                        <Animated.View style={{ opacity: pulseAnim }}>
                            <Text style={{ fontSize: 12 }}>🧠</Text>
                        </Animated.View>
                    ) : (
                        <Text style={{ fontSize: 12 }}>🧠</Text>
                    )}
                </View>
                <Text style={[styles.thinkingTitle, streaming && styles.thinkingTitleActive]}>
                    {streaming ? 'Reasoning...' : 'Thought process'}
                </Text>
                <Text style={styles.thinkingChevron}>
                    {isOpen ? '▼' : '▶'}
                </Text>
            </TouchableOpacity>

            {isOpen && thinking ? (
                <View style={styles.thinkingContentWrapper}>
                    <Text style={styles.thinkingContent}>
                        {thinking}
                        {streaming && <Text style={{ color: colors.accentPrimary }}> ▊</Text>}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

export default function ChatScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const [selectedImage, setSelectedImage] = useState<{ uri: string, base64: string } | null>(null);

    // Model selector
    const [installedModels, setInstalledModels] = useState<any[]>([]);
    const [activeModel, setActiveModel] = useState('');
    const [showModelPicker, setShowModelPicker] = useState(false);

    const loadModels = async () => {
        try {
            const res = await chatApi.ollamaModels();
            setInstalledModels(res.data.models || []);
            setActiveModel(res.data.active || '');
        } catch (err) { }
    };

    const handleModelSwitch = async (modelId: string) => {
        try {
            await chatApi.switchModel(modelId);
            setActiveModel(modelId);
            setShowModelPicker(false);
        } catch (err) {
            console.error('Model switch failed:', err);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setSelectedImage({
                uri: result.assets[0].uri,
                base64: result.assets[0].base64,
            });
        }
    };

    const handleSend = async (text?: string) => {
        const msg = (text || input).trim();
        if ((!msg && !selectedImage) || loading) return;

        setInput('');
        const currentImage = selectedImage;
        setSelectedImage(null);

        setMessages(prev => [...prev, {
            role: 'user',
            content: msg,
            image_url: currentImage ? currentImage.uri : undefined
        }]);
        setLoading(true);

        const baseUrl = api.defaults.baseURL || 'http://192.168.1.4:8000/api';

        // Setup empty assistant message we will fill via stream
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '',
            thinking: '',
            actions: [],
            streaming: true,
        }]);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}/chat`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        let customHeaders = api.defaults.headers;
        if (customHeaders && typeof customHeaders === 'object') {
            for (const [key, value] of Object.entries(customHeaders)) {
                if (typeof value === 'string') xhr.setRequestHeader(key, value);
            }
        }

        let seenBytes = 0;

        xhr.onprogress = () => {
            const chunk = xhr.responseText.substring(seenBytes);
            seenBytes = xhr.responseText.length;

            const lines = chunk.split('\n');
            let newlyStreamedChatContent = '';
            let newlyStreamedThinkingContent = '';
            let parsedActions: any[] = [];
            let isDone = false;
            let finalConversationId: string | null = null;

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') {
                        isDone = true;
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.type === 'token') {
                            newlyStreamedChatContent += parsed.content;
                        } else if (parsed.type === 'thinking_token') {
                            newlyStreamedThinkingContent += parsed.content;
                        } else if (parsed.type === 'action') {
                            parsedActions.push({
                                tool: parsed.tool,
                                args: parsed.args || {},
                                summary: parsed.summary,
                                status: parsed.status,
                            });
                        } else if (parsed.type === 'final') {
                            finalConversationId = parsed.conversation_id;
                        }
                    } catch (e) {
                        // malformed JSON block occasionally happens on split boundaries
                    }
                }
            }

            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    if (newlyStreamedChatContent) lastMsg.content += newlyStreamedChatContent;
                    if (newlyStreamedThinkingContent) lastMsg.thinking += newlyStreamedThinkingContent;
                    if (parsedActions.length > 0) {
                        lastMsg.actions = [...(lastMsg.actions || []), ...parsedActions];
                    }
                    if (isDone) {
                        lastMsg.streaming = false;
                    }
                }
                return newMsgs;
            });

            if (finalConversationId && !conversationId) {
                setConversationId(finalConversationId);
            }
        };

        xhr.onload = () => {
            setLoading(false);
            if (xhr.status >= 400) {
                Alert.alert('Error', 'Failed to get response from server.');
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === 'assistant' && !lastMsg.content && !lastMsg.thinking) {
                        lastMsg.content = '❌ Failed to get response. Is the server running?';
                        lastMsg.streaming = false;
                    }
                    return newMsgs;
                });
            } else {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        lastMsg.streaming = false;
                    }
                    return newMsgs;
                });
            }
        };

        xhr.onerror = () => {
            setLoading(false);
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.role === 'assistant') {
                    lastMsg.content = lastMsg.content || '❌ Failed to connect to server.';
                    lastMsg.streaming = false;
                }
                return newMsgs;
            });
        };

        xhr.send(JSON.stringify({
            message: msg,
            conversation_id: conversationId || undefined,
            image_base64: currentImage?.base64,
            stream: true, // Tell API to stream back
        }));
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
            headerTitle: () => (
                <TouchableOpacity
                    onPress={() => { if (installedModels.length > 0) setShowModelPicker(true); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Ask SMS</Text>
                    {activeModel ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgTertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>{activeModel.split(':')[0]}</Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 2 }}>▾</Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity onPress={handleClear} style={{ marginRight: spacing.md }}>
                    <Text style={{ color: colors.textMuted, fontSize: 14 }}>Clear</Text>
                </TouchableOpacity>
            ),
        });
    }, [conversationId, activeModel, installedModels]);

    useEffect(() => {
        loadModels();
    }, []);

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
                {item.role === 'assistant' && (item.thinking || item.streaming) && (
                    <ThinkingBlock thinking={item.thinking} streaming={item.streaming && !item.content} />
                )}

                {item.image_url && (
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.msgImage}
                    />
                )}
                {!!item.content && (
                    <Text style={[
                        styles.bubbleText,
                        item.role === 'user' && { color: '#fff' },
                    ]}>{item.content}</Text>
                )}
            </View>
        </View>
    );

    return (
        <>
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

                {/* Input */}
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    {selectedImage && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => setSelectedImage(null)}
                            >
                                <Text style={styles.removeImageText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputBar}>
                        <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={loading}>
                            <Text style={styles.attachIcon}>📷</Text>
                        </TouchableOpacity>
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
                            style={[styles.sendButton, (!input.trim() && !selectedImage || loading) && { opacity: 0.4 }]}
                            onPress={() => handleSend()}
                            disabled={(!input.trim() && !selectedImage) || loading}
                        >
                            <Text style={styles.sendIcon}>↑</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Model Picker Modal */}
            <Modal visible={showModelPicker} transparent animationType="slide" onRequestClose={() => setShowModelPicker(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShowModelPicker(false)}>
                    <View style={{ flex: 1 }} />
                    <View style={{ backgroundColor: colors.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16 }}>
                        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
                            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, paddingHorizontal: 20, paddingVertical: 12 }}>Switch Model</Text>
                        {installedModels.map((m: any) => (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => handleModelSwitch(m.id)}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 10,
                                    paddingHorizontal: 20, paddingVertical: 14,
                                    backgroundColor: m.id === activeModel ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    borderTopWidth: 1, borderTopColor: colors.border,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: m.id === activeModel ? '700' : '500', color: m.id === activeModel ? colors.accentPrimary : colors.textPrimary }}>
                                        {m.id}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{m.size_gb} GB</Text>
                                </View>
                                {m.id === activeModel && (
                                    <View style={{ backgroundColor: '#22c55e20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#22c55e' }}>Active</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
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
    // Thinking Block styles
    thinkingContainer: {
        marginBottom: spacing.sm,
        width: '100%',
        borderRadius: 14,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    thinkingContainerActive: {
        borderColor: 'rgba(139, 92, 246, 0.4)',
    },
    thinkingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    thinkingIconBg: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thinkingIconBgActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
    },
    thinkingTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
        flex: 1,
        letterSpacing: 0.2,
    },
    thinkingTitleActive: {
        color: '#a78bfa',
    },
    thinkingChevron: {
        fontSize: 10,
        color: colors.textMuted,
        opacity: 0.5,
    },
    thinkingContentWrapper: {
        paddingHorizontal: 14,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10,
    },
    thinkingContent: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    attachBtn: {
        padding: spacing.xs,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachIcon: {
        fontSize: 22,
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
        maxHeight: 100,
    },
    msgImage: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: spacing.xs,
    },
    imagePreviewContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        flexDirection: 'row',
    },
    imagePreview: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.md,
    },
    removeImageBtn: {
        position: 'absolute',
        top: spacing.sm - 8,
        left: spacing.md + 45,
        backgroundColor: colors.error,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    removeImageText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: -2,
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
