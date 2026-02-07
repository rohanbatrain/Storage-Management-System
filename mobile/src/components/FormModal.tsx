import React from 'react';
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
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../styles/theme';

interface SelectOption {
    value: string;
    label: string;
    icon?: string;
}

interface FormField {
    key: string;
    label: string;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'numeric' | 'email-address';
    required?: boolean;
    type?: 'text' | 'checkbox' | 'select';
    options?: SelectOption[];
}

interface FormModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, any>) => void;
    title: string;
    icon: string;
    fields: FormField[];
    initialValues?: Record<string, any>;
    loading?: boolean;
    submitLabel?: string;
    accentColor?: string;
}

export default function FormModal({
    visible,
    onClose,
    onSubmit,
    title,
    icon,
    fields,
    initialValues = {},
    loading = false,
    submitLabel = 'Save',
    accentColor = colors.accentPrimary,
}: FormModalProps) {
    const insets = useSafeAreaInsets();
    const [formData, setFormData] = React.useState<Record<string, any>>(initialValues);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) {
            setFormData(initialValues);
            setErrors({});
        }
    }, [visible, initialValues]);

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: '' }));
        }
    };

    const handleSubmit = () => {
        // Validate required fields
        const newErrors: Record<string, string> = {};
        fields.forEach(field => {
            if (field.required && !formData[field.key]?.toString().trim()) {
                newErrors[field.key] = `${field.label} is required`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    const renderField = (field: FormField) => {
        const fieldType = field.type || 'text';

        if (fieldType === 'checkbox') {
            return (
                <View key={field.key} style={styles.checkboxContainer}>
                    <Switch
                        value={!!formData[field.key]}
                        onValueChange={(value) => handleChange(field.key, value)}
                        trackColor={{ false: colors.bgTertiary, true: accentColor + '60' }}
                        thumbColor={formData[field.key] ? accentColor : colors.textMuted}
                    />
                    <Text style={styles.checkboxLabel}>{field.label}</Text>
                </View>
            );
        }

        if (fieldType === 'select' && field.options) {
            return (
                <View key={field.key} style={styles.fieldContainer}>
                    <Text style={styles.label}>
                        {field.label}
                        {field.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.selectScroll}
                    >
                        {field.options.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.selectOption,
                                    formData[field.key] === option.value && {
                                        backgroundColor: accentColor + '20',
                                        borderColor: accentColor,
                                    }
                                ]}
                                onPress={() => handleChange(field.key, option.value)}
                            >
                                {option.icon && <Text style={styles.selectIcon}>{option.icon}</Text>}
                                <Text style={[
                                    styles.selectText,
                                    formData[field.key] === option.value && { color: accentColor }
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            );
        }

        return (
            <View key={field.key} style={styles.fieldContainer}>
                <Text style={styles.label}>
                    {field.label}
                    {field.required && <Text style={styles.required}> *</Text>}
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        field.multiline && styles.inputMultiline,
                        errors[field.key] && styles.inputError,
                    ]}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor={colors.textMuted}
                    value={formData[field.key]?.toString() || ''}
                    onChangeText={(value) => handleChange(field.key, value)}
                    multiline={field.multiline}
                    numberOfLines={field.multiline ? 3 : 1}
                    keyboardType={field.keyboardType || 'default'}
                    textAlignVertical={field.multiline ? 'top' : 'center'}
                />
                {errors[field.key] && (
                    <Text style={styles.errorText}>{errors[field.key]}</Text>
                )}
            </View>
        );
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
                                    <View style={[styles.iconWrapper, { backgroundColor: accentColor + '20' }]}>
                                        <Text style={styles.icon}>{icon}</Text>
                                    </View>
                                    <Text style={styles.title}>{title}</Text>
                                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                        <Text style={styles.closeIcon}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Form Fields */}
                                <ScrollView
                                    style={styles.formScroll}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {fields.map(renderField)}
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
                                        style={[styles.submitButton, { backgroundColor: accentColor }]}
                                        onPress={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={colors.textPrimary} size="small" />
                                        ) : (
                                            <Text style={styles.submitText}>{submitLabel}</Text>
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

// Confirmation Dialog Component
interface ConfirmDialogProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    loading?: boolean;
}

export function ConfirmDialog({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Delete',
    confirmColor = colors.error,
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.dialog}>
                            <Text style={styles.dialogIcon}>⚠️</Text>
                            <Text style={styles.dialogTitle}>{title}</Text>
                            <Text style={styles.dialogMessage}>{message}</Text>
                            <View style={styles.dialogActions}>
                                <TouchableOpacity
                                    style={styles.dialogCancel}
                                    onPress={onClose}
                                    disabled={loading}
                                >
                                    <Text style={styles.dialogCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dialogConfirm, { backgroundColor: confirmColor }]}
                                    onPress={onConfirm}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={colors.textPrimary} size="small" />
                                    ) : (
                                        <Text style={styles.dialogConfirmText}>{confirmLabel}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// Floating Action Button
interface FABProps {
    icon: string;
    onPress: () => void;
    color?: string;
}

export function FAB({ icon, onPress, color = colors.accentPrimary }: FABProps) {
    return (
        <TouchableOpacity
            style={[styles.fab, { backgroundColor: color }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={styles.fabIcon}>{icon}</Text>
        </TouchableOpacity>
    );
}

// Location Picker Modal
interface LocationPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (locationId: string, locationName: string) => void;
    locations: any[];
    title?: string;
}

export function LocationPicker({
    visible,
    onClose,
    onSelect,
    locations,
    title = 'Select Location',
}: LocationPickerProps) {
    const insets = useSafeAreaInsets();

    // Flatten tree for display
    const flattenTree = (nodes: any[], depth = 0): any[] => {
        let result: any[] = [];
        for (const node of nodes) {
            result.push({ ...node, depth });
            if (node.children) {
                result = result.concat(flattenTree(node.children, depth + 1));
            }
        }
        return result;
    };

    const flatLocations = flattenTree(locations);

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
                        <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg, maxHeight: '70%' }]}>
                            <View style={styles.header}>
                                <View style={[styles.iconWrapper, { backgroundColor: colors.accentPrimary + '20' }]}>
                                    <Text style={styles.icon}>📍</Text>
                                </View>
                                <Text style={styles.title}>{title}</Text>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.closeIcon}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.formScroll}>
                                {flatLocations.map((loc) => (
                                    <TouchableOpacity
                                        key={loc.id}
                                        style={[styles.locationOption, { paddingLeft: spacing.lg + (loc.depth * 16) }]}
                                        onPress={() => {
                                            onSelect(loc.id, loc.name);
                                            onClose();
                                        }}
                                    >
                                        <Text style={styles.locationIcon}>
                                            {loc.depth > 0 ? '└' : '📁'}
                                        </Text>
                                        <Text style={styles.locationName}>{loc.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
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
        maxHeight: 400,
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
    inputMultiline: {
        minHeight: 80,
        paddingTop: spacing.md,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        marginTop: spacing.xs,
    },
    // Checkbox styles
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    checkboxLabel: {
        fontSize: 15,
        color: colors.textPrimary,
        flex: 1,
    },
    // Select styles
    selectScroll: {
        flexDirection: 'row',
    },
    selectOption: {
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
    selectIcon: {
        fontSize: 16,
    },
    selectText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
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
    // Confirm Dialog
    dialog: {
        backgroundColor: colors.bgSecondary,
        margin: spacing.xl,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
    },
    dialogIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    dialogTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    dialogMessage: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    dialogActions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    dialogCancel: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
    },
    dialogCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    dialogConfirm: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    dialogConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 100,
        right: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabIcon: {
        fontSize: 24,
    },
    // Location Picker
    locationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
    },
    locationIcon: {
        fontSize: 16,
        color: colors.textMuted,
    },
    locationName: {
        fontSize: 15,
        color: colors.textPrimary,
    },
});
