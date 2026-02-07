import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../styles/theme';

// Style types with icons and labels
const styleLabels: { [key: string]: { label: string; icon: string } } = {
    formal: { label: 'Formal', icon: '👔' },
    casual: { label: 'Casual', icon: '👕' },
    sports: { label: 'Sports', icon: '🏃' },
    lounge: { label: 'Lounge', icon: '🛋️' },
    outerwear: { label: 'Outerwear', icon: '🧥' },
    essentials: { label: 'Essentials', icon: '🩲' },
};

// Category labels with icons
const categoryLabels: { [key: string]: string } = {
    // Formal
    dress_shirt: '👔 Dress Shirt',
    blazer: '🎩 Blazer',
    dress_pants: '👖 Dress Pants',
    tie: '👔 Tie',
    formal_shoes: '👞 Formal Shoes',
    // Casual
    tshirt: '👕 T-Shirt',
    polo: '👕 Polo',
    casual_shirt: '👔 Casual Shirt',
    jeans: '👖 Jeans',
    chinos: '👖 Chinos',
    shorts: '🩳 Shorts',
    sneakers: '👟 Sneakers',
    // Sports
    sports_tshirt: '🏃 Sports T-Shirt',
    track_pants: '🏃 Track Pants',
    athletic_shorts: '🩳 Athletic Shorts',
    sports_shoes: '👟 Sports Shoes',
    gym_wear: '🏋️ Gym Wear',
    // Lounge
    pajamas: '🛌 Pajamas',
    sweatpants: '👖 Sweatpants',
    sleepwear: '🛌 Sleepwear',
    // Outerwear
    jacket: '🧥 Jacket',
    coat: '🧥 Coat',
    sweater: '🧶 Sweater',
    hoodie: '🧥 Hoodie',
    windbreaker: '🧥 Windbreaker',
    // Essentials
    underwear: '🩲 Underwear',
    socks: '🧦 Socks',
    vest: '👕 Vest',
    belt: '🔗 Belt',
};

// Style to categories mapping
const styleCategories: { [key: string]: string[] } = {
    formal: ['dress_shirt', 'blazer', 'dress_pants', 'tie', 'formal_shoes'],
    casual: ['tshirt', 'polo', 'casual_shirt', 'jeans', 'chinos', 'shorts', 'sneakers'],
    sports: ['sports_tshirt', 'track_pants', 'athletic_shorts', 'sports_shoes', 'gym_wear'],
    lounge: ['pajamas', 'sweatpants', 'sleepwear', 'hoodie'],
    outerwear: ['jacket', 'coat', 'sweater', 'hoodie', 'windbreaker'],
    essentials: ['underwear', 'socks', 'vest', 'belt'],
};

interface AddClothingModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: {
        name: string;
        style: string;
        category: string;
        color: string;
    }) => void;
    loading?: boolean;
}

export default function AddClothingModal({
    visible,
    onClose,
    onSubmit,
    loading = false,
}: AddClothingModalProps) {
    const insets = useSafeAreaInsets();
    
    const [name, setName] = useState('');
    const [style, setStyle] = useState('casual');
    const [category, setCategory] = useState('tshirt');
    const [color, setColor] = useState('');
    const [error, setError] = useState('');

    // Get filtered categories based on selected style
    const availableCategories = styleCategories[style] || [];

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            setName('');
            setStyle('casual');
            setCategory('tshirt');
            setColor('');
            setError('');
        }
    }, [visible]);

    // Update category when style changes
    useEffect(() => {
        if (!availableCategories.includes(category)) {
            setCategory(availableCategories[0] || 'other');
        }
    }, [style]);

    const handleSubmit = () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        onSubmit({ name: name.trim(), style, category, color: color.trim() });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.keyboardView}
                        >
                            <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
                                {/* Header */}
                                <View style={styles.header}>
                                    <View style={[styles.iconWrapper, { backgroundColor: '#a855f7' + '20' }]}>
                                        <Text style={styles.icon}>👕</Text>
                                    </View>
                                    <Text style={styles.title}>Add Clothing</Text>
                                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                        <Text style={styles.closeIcon}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView
                                    style={styles.formScroll}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {/* Name Input */}
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.label}>Item Name <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            style={[styles.input, error && styles.inputError]}
                                            placeholder='e.g., "Blue Polo Shirt"'
                                            placeholderTextColor={colors.textMuted}
                                            value={name}
                                            onChangeText={(v) => { setName(v); setError(''); }}
                                        />
                                        {error && <Text style={styles.errorText}>{error}</Text>}
                                    </View>

                                    {/* Style Selector - Grid */}
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.label}>Style</Text>
                                        <View style={styles.styleGrid}>
                                            {Object.entries(styleLabels).map(([key, { label, icon }]) => (
                                                <TouchableOpacity
                                                    key={key}
                                                    style={[
                                                        styles.styleOption,
                                                        style === key && styles.styleOptionSelected
                                                    ]}
                                                    onPress={() => setStyle(key)}
                                                >
                                                    <Text style={styles.styleIcon}>{icon}</Text>
                                                    <Text style={[
                                                        styles.styleLabel,
                                                        style === key && styles.styleLabelSelected
                                                    ]}>{label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Category Selector - Filtered by Style */}
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.label}>Category</Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={styles.categoryScroll}
                                        >
                                            {availableCategories.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat}
                                                    style={[
                                                        styles.categoryOption,
                                                        category === cat && styles.categoryOptionSelected
                                                    ]}
                                                    onPress={() => setCategory(cat)}
                                                >
                                                    <Text style={styles.categoryIcon}>
                                                        {categoryLabels[cat]?.split(' ')[0] || '📦'}
                                                    </Text>
                                                    <Text style={[
                                                        styles.categoryLabel,
                                                        category === cat && styles.categoryLabelSelected
                                                    ]}>
                                                        {categoryLabels[cat]?.replace(/^[^\s]+\s/, '') || cat}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Color Input */}
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.label}>Color (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder='e.g., "Navy Blue"'
                                            placeholderTextColor={colors.textMuted}
                                            value={color}
                                            onChangeText={setColor}
                                        />
                                    </View>
                                </ScrollView>

                                {/* Actions */}
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={onClose}
                                        disabled={loading}
                                    >
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.submitButton, { backgroundColor: '#a855f7' }]}
                                        onPress={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={colors.textPrimary} size="small" />
                                        ) : (
                                            <Text style={styles.submitText}>Add to Wardrobe</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: colors.bgSecondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    icon: {
        fontSize: 24,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: colors.textMuted,
    },
    formScroll: {
        padding: spacing.lg,
        maxHeight: 450,
    },
    fieldContainer: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    required: {
        color: colors.error,
    },
    input: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        marginTop: spacing.xs,
    },
    // Style Grid
    styleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    styleOption: {
        width: '31%',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
    },
    styleOptionSelected: {
        backgroundColor: '#a855f7' + '20',
        borderColor: '#a855f7',
    },
    styleIcon: {
        fontSize: 20,
        marginBottom: 2,
    },
    styleLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    styleLabelSelected: {
        color: '#a855f7',
    },
    // Category Scroll
    categoryScroll: {
        flexDirection: 'row',
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
        gap: spacing.xs,
        backgroundColor: colors.bgTertiary,
    },
    categoryOptionSelected: {
        backgroundColor: '#a855f7' + '20',
        borderColor: '#a855f7',
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    categoryLabelSelected: {
        color: '#a855f7',
    },
    // Actions
    actions: {
        flexDirection: 'row',
        padding: spacing.lg,
        paddingTop: 0,
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    submitButton: {
        flex: 2,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
});
