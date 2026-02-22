import { useState, useRef, useEffect } from 'react';
import { Upload, X, Link as LinkIcon, Image as ImageIcon, Loader } from 'lucide-react';
import { imageApi } from '../services/api';

function ImageUpload({ value, onChange, placeholder = "Upload an image" }) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState(value ? 'preview' : 'upload'); // preview, upload, url
    const [urlInput, setUrlInput] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (value) {
            setMode('preview');
        } else if (mode === 'preview') {
            setMode('upload');
        }
    }, [value]);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setUploading(true);
        try {
            const res = await imageApi.upload(file);
            // Construct full URL if returned relative
            let imageUrl = res.data.url;
            if (imageUrl.startsWith('/')) {
                imageUrl = `${import.meta.env.VITE_API_URL}${imageUrl}`;
            }
            onChange(imageUrl);
            setMode('preview');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handlePaste = (e) => {
        if (mode !== 'upload') return;
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                handleFile(file);
                break;
            }
        }
    };

    // Listen for paste events when component is mounted
    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [mode]);

    const clearImage = () => {
        onChange('');
        setMode('upload');
        setUrlInput('');
    };

    if (mode === 'preview' && value) {
        return (
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                <div style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-tertiary)',
                    position: 'relative',
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src={value}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    <button
                        type="button"
                        onClick={clearImage}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'url') {
        return (
            <div className="form-group">
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input
                        type="url"
                        className="input"
                        placeholder="https://example.com/image.jpg"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!urlInput}
                        onClick={() => {
                            onChange(urlInput);
                            setMode('preview');
                        }}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setMode('upload')}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
                border: `2px dashed ${dragActive ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-lg)',
                textAlign: 'center',
                background: dragActive ? 'var(--color-bg-tertiary)' : 'transparent',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative'
            }}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ display: 'none' }}
            />

            {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                    <Loader size={24} className="spin" />
                    <span>Uploading...</span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                    <Upload size={24} />
                    <div>
                        <span style={{ color: 'var(--color-accent-primary)', fontWeight: 500 }}>Click to upload</span> or drag and drop
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                        Paste image from clipboard directly
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '100%', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                        <div style={{ height: 1, background: 'var(--color-border)', flex: 1 }}></div>
                        <span style={{ fontSize: 'var(--font-size-xs)' }}>OR</span>
                        <div style={{ height: 1, background: 'var(--color-border)', flex: 1 }}></div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMode('url');
                        }}
                    >
                        <LinkIcon size={14} />
                        Use Image URL
                    </button>
                </div>
            )}
        </div>
    );
}

export default ImageUpload;
