'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

interface SeriesData {
    name: string;
    videos: string[];
}

interface UploadItem {
    file: File;
    progress: number; // 0-100
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
}

export default function AdminPage() {
    const [seriesList, setSeriesList] = useState<SeriesData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSeries, setActiveSeries] = useState<string | null>(null);

    // New series
    const [newSeriesName, setNewSeriesName] = useState('');
    const [creatingSeriesMsg, setCreatingSeriesMsg] = useState('');

    // Upload queue
    const [uploadTarget, setUploadTarget] = useState<string | null>(null);
    const [queue, setQueue] = useState<UploadItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshData = async () => {
        const res = await fetch('/api/videos');
        const data = await res.json();
        const names: string[] = data.series ?? [];

        const all: SeriesData[] = await Promise.all(
            names.map(async (name) => {
                const r = await fetch(`/api/videos?series=${encodeURIComponent(name)}`);
                const d = await r.json();
                return { name, videos: d.videos ?? [] };
            })
        );
        setSeriesList(all);
        if (all.length > 0 && !activeSeries) setActiveSeries(all[0].name);
        setLoading(false);
    };

    useEffect(() => { refreshData(); }, []);

    // Create series
    const createSeries = async () => {
        const name = newSeriesName.trim();
        if (!name) return;
        setCreatingSeriesMsg('Creating…');
        const res = await fetch('/api/admin/series', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (res.ok) {
            setNewSeriesName('');
            setCreatingSeriesMsg('');
            await refreshData();
            setActiveSeries(name);
        } else {
            setCreatingSeriesMsg(data.error ?? 'Error');
        }
    };

    // Delete video
    const deleteVideo = async (series: string, filename: string) => {
        if (!confirm(`Delete "${filename}" from ${series}?`)) return;
        await fetch('/api/admin/series', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ series, filename }),
        });
        await refreshData();
    };

    // Add files to queue
    const addFiles = (files: FileList | null) => {
        if (!files) return;
        const items: UploadItem[] = Array.from(files).map(f => ({
            file: f,
            progress: 0,
            status: 'pending',
        }));
        setQueue(prev => [...prev, ...items]);
    };

    // Upload with XHR for progress tracking
    const uploadFile = (item: UploadItem, series: string): Promise<void> =>
        new Promise((resolve) => {
            const form = new FormData();
            form.append('series', series);
            form.append('file', item.file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/admin/upload');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setQueue(prev =>
                        prev.map(q => q.file === item.file ? { ...q, progress: pct, status: 'uploading' } : q)
                    );
                }
            };

            xhr.onload = () => {
                const success = xhr.status >= 200 && xhr.status < 300;
                setQueue(prev =>
                    prev.map(q =>
                        q.file === item.file
                            ? { ...q, progress: 100, status: success ? 'done' : 'error', error: success ? undefined : 'Upload failed' }
                            : q
                    )
                );
                resolve();
            };

            xhr.onerror = () => {
                setQueue(prev =>
                    prev.map(q =>
                        q.file === item.file ? { ...q, status: 'error', error: 'Network error' } : q
                    )
                );
                resolve();
            };

            xhr.send(form);
        });

    const startUpload = async () => {
        if (!uploadTarget || uploading) return;
        const pending = queue.filter(q => q.status === 'pending');
        if (pending.length === 0) return;
        setUploading(true);
        for (const item of pending) {
            await uploadFile(item, uploadTarget);
        }
        setUploading(false);
        await refreshData();
    };

    const clearDone = () => setQueue(q => q.filter(i => i.status !== 'done' && i.status !== 'error'));
    const removeFromQueue = (file: File) => setQueue(q => q.filter(i => i.file !== file));

    const activeData = seriesList.find(s => s.name === activeSeries);

    const formatBytes = (b: number) => {
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
        return `${(b / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
        <div className={styles.page}>
            {/* Top Nav */}
            <header className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="3" width="20" height="14" rx="3" fill="#6366f1" />
                        <polygon points="10 8 16 11 10 14" fill="white" />
                    </svg>
                    <span className={styles.topBarTitle}>SeriesPro <span>Admin</span></span>
                </div>
                <Link href="/" className={styles.viewSiteBtn}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                    View Site
                </Link>
            </header>

            <div className={styles.layout}>
                {/* Sidebar: series list */}
                <aside className={styles.sidebar}>
                    <p className={styles.sidebarLabel}>Series</p>
                    {loading ? (
                        <div className={styles.spinner} />
                    ) : seriesList.map(s => (
                        <button
                            key={s.name}
                            className={`${styles.seriesBtn} ${activeSeries === s.name ? styles.seriesBtnActive : ''}`}
                            onClick={() => setActiveSeries(s.name)}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" /></svg>
                            <span>{s.name}</span>
                            <span className={styles.videoCount}>{s.videos.length}</span>
                        </button>
                    ))}

                    {/* Create new series */}
                    <div className={styles.newSeriesForm}>
                        <p className={styles.sidebarLabel} style={{ marginBottom: '0.5rem' }}>New Series</p>
                        <input
                            className={styles.textInput}
                            type="text"
                            placeholder="Series name…"
                            value={newSeriesName}
                            onChange={e => setNewSeriesName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createSeries()}
                        />
                        <button className={styles.createBtn} onClick={createSeries}>
                            + Create
                        </button>
                        {creatingSeriesMsg && (
                            <p className={styles.statusMsg}>{creatingSeriesMsg}</p>
                        )}
                    </div>
                </aside>

                {/* Main Panel */}
                <main className={styles.main}>
                    {!activeSeries ? (
                        <div className={styles.empty}>Select or create a series to get started.</div>
                    ) : (
                        <>
                            <div className={styles.panelHeader}>
                                <div>
                                    <h1 className={styles.panelTitle}>{activeSeries}</h1>
                                    <p className={styles.panelSub}>{activeData?.videos.length ?? 0} video{activeData?.videos.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>

                            {/* Upload Zone */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>Upload Videos</h2>
                                <div
                                    className={styles.dropZone}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
                                    onDragLeave={e => e.currentTarget.classList.remove(styles.dragOver)}
                                    onDrop={e => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove(styles.dragOver);
                                        addFiles(e.dataTransfer.files);
                                        setUploadTarget(activeSeries);
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" className={styles.dropIcon}>
                                        <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                                    </svg>
                                    <p className={styles.dropText}>Drag & drop videos here, or <span>browse</span></p>
                                    <p className={styles.dropSub}>MP4, MKV, AVI, MOV, WEBM supported</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*,.mp4,.mkv,.avi,.mov,.webm"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={e => { addFiles(e.target.files); setUploadTarget(activeSeries); e.target.value = ''; }}
                                    />
                                </div>

                                {/* Upload queue */}
                                {queue.length > 0 && (
                                    <div className={styles.queueBox}>
                                        <div className={styles.queueHeader}>
                                            <span>{queue.length} file{queue.length !== 1 ? 's' : ''} queued → <strong>{uploadTarget}</strong></span>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className={styles.clearBtn} onClick={clearDone}>Clear done</button>
                                                <button
                                                    className={styles.uploadBtn}
                                                    onClick={startUpload}
                                                    disabled={uploading || queue.every(q => q.status !== 'pending')}
                                                >
                                                    {uploading ? 'Uploading…' : `Upload ${queue.filter(q => q.status === 'pending').length} files`}
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.queueList}>
                                            {queue.map((item, i) => (
                                                <div key={i} className={styles.queueItem}>
                                                    <div className={styles.queueItemInfo}>
                                                        <span className={`${styles.queueStatus} ${styles[item.status]}`}>
                                                            {item.status === 'done' ? '✓' : item.status === 'error' ? '✕' : item.status === 'uploading' ? '↑' : '○'}
                                                        </span>
                                                        <span className={styles.queueName}>{item.file.name}</span>
                                                        <span className={styles.queueSize}>{formatBytes(item.file.size)}</span>
                                                    </div>
                                                    {item.status === 'uploading' || item.status === 'done' ? (
                                                        <div className={styles.progressBar}>
                                                            <div className={styles.progressFill} style={{ width: `${item.progress}%` }} />
                                                        </div>
                                                    ) : item.status === 'error' ? (
                                                        <p className={styles.queueError}>{item.error}</p>
                                                    ) : (
                                                        <button className={styles.removeBtn} onClick={() => removeFromQueue(item.file)}>✕</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Video list */}
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>Existing Videos</h2>
                                {(activeData?.videos.length ?? 0) === 0 ? (
                                    <p className={styles.emptySmall}>No videos yet. Upload some above.</p>
                                ) : (
                                    <div className={styles.videoGrid}>
                                        {activeData?.videos.map(vid => (
                                            <div key={vid} className={styles.videoCard}>
                                                <div className={styles.videoCardIcon}>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                                                </div>
                                                <span className={styles.videoCardName}>{vid}</span>
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => deleteVideo(activeSeries, vid)}
                                                    title="Delete"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
