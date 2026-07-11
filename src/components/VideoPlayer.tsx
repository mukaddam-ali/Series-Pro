'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './VideoPlayer.module.css';

interface Props {
    src: string;
    title: string;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}

function formatTime(s: number) {
    if (isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({ src, title, onNext, onPrev, hasNext, hasPrev }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [buffered, setBuffered] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [seeking, setSeeking] = useState(false);

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Load new video when src changes
    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.load();
        videoRef.current.play().catch(() => { });
        setCurrentTime(0);
        setDuration(0);
        setPlaying(true);
    }, [src]);

    // Auto-hide controls
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            if (playing) setShowControls(false);
        }, 3000);
    }, [playing]);

    useEffect(() => {
        if (!playing) setShowControls(true);
    }, [playing]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const v = videoRef.current;
            if (!v) return;
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    toggle();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    v.currentTime = Math.min(v.currentTime + 10, v.duration);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    v.currentTime = Math.max(v.currentTime - 10, 0);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(prev => { const n = Math.min(prev + 0.1, 1); v.volume = n; return n; });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(prev => { const n = Math.max(prev - 0.1, 0); v.volume = n; return n; });
                    break;
                case 'm':
                    toggleMute();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'n':
                    if (hasNext) onNext?.();
                    break;
                case 'p':
                    if (hasPrev) onPrev?.();
                    break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [hasNext, hasPrev, onNext, onPrev, playing]);

    // Fullscreen change sync
    useEffect(() => {
        const onChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggle = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const onTimeUpdate = () => {
        const v = videoRef.current;
        if (!v || seeking) return;
        setCurrentTime(v.currentTime);
        // update buffered
        if (v.buffered.length > 0) {
            setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
        }
    };

    const onProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const bar = progressRef.current;
        const v = videoRef.current;
        if (!bar || !v) return;
        const rect = bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        v.currentTime = pct * v.duration;
        setCurrentTime(v.currentTime);
    };

    const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) videoRef.current.volume = val;
        setMuted(val === 0);
    };

    const setSpeed = (speed: number) => {
        if (videoRef.current) videoRef.current.playbackRate = speed;
        setPlaybackRate(speed);
        setShowSpeedMenu(false);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const VolumeIcon = () => {
        if (muted || volume === 0) return (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
        );
        if (volume < 0.5) return (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
        );
        return (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
        );
    };

    return (
        <div
            ref={containerRef}
            className={`${styles.player} ${fullscreen ? styles.fullscreen : ''}`}
            onMouseMove={resetHideTimer}
            onMouseLeave={() => { if (playing) setShowControls(false); }}
        >
            <video
                ref={videoRef}
                className={styles.video}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={() => { setDuration(videoRef.current?.duration || 0); }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); if (hasNext) onNext?.(); }}
                onClick={toggle}
            >
                <source src={src} type="video/mp4" />
            </video>

            {/* Center play/pause flash */}
            <div className={`${styles.centerIcon} ${!playing ? styles.showCenter : ''}`}>
                {!playing && (
                    <svg viewBox="0 0 24 24" fill="white" width="60" height="60">
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                )}
            </div>

            {/* Controls overlay */}
            <div className={`${styles.controls} ${showControls ? styles.visible : ''}`}>
                {/* Title bar */}
                <div className={styles.titleBar}>
                    <span className={styles.videoTitle}>{title}</span>
                </div>

                {/* Progress bar */}
                <div
                    ref={progressRef}
                    className={styles.progressBar}
                    onClick={onProgressClick}
                >
                    <div className={styles.progressBg} />
                    <div className={styles.progressBuffered} style={{ width: `${buffered}%` }} />
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                    <div className={styles.progressThumb} style={{ left: `${progress}%` }} />
                </div>

                {/* Bottom controls */}
                <div className={styles.bottomBar}>
                    {/* Left: play controls */}
                    <div className={styles.leftControls}>
                        <button className={styles.iconBtn} onClick={onPrev} disabled={!hasPrev} title="Previous (P)">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                        </button>

                        <button className={styles.iconBtn} onClick={toggle} title="Play/Pause (Space)">
                            {playing
                                ? <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                : <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            }
                        </button>

                        <button className={styles.iconBtn} onClick={onNext} disabled={!hasNext} title="Next (N)">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                        </button>

                        <button className={styles.iconBtn} onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} title="Rewind 10s">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /><text x="6.5" y="15.5" fontSize="6" fill="currentColor" fontFamily="Arial">10</text></svg>
                        </button>

                        <button className={styles.iconBtn} onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} title="Forward 10s">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" /><text x="6.5" y="15.5" fontSize="6" fill="currentColor" fontFamily="Arial">10</text></svg>
                        </button>

                        {/* Volume */}
                        <div className={styles.volumeGroup}>
                            <button className={styles.iconBtn} onClick={toggleMute} title="Mute (M)">
                                <VolumeIcon />
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={muted ? 0 : volume}
                                onChange={onVolumeChange}
                                className={styles.volumeSlider}
                            />
                        </div>

                        <span className={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>

                    {/* Right: speed + fullscreen */}
                    <div className={styles.rightControls}>
                        <div className={styles.speedWrapper}>
                            <button className={styles.speedBtn} onClick={() => setShowSpeedMenu(p => !p)} title="Playback speed">
                                {playbackRate}×
                            </button>
                            {showSpeedMenu && (
                                <div className={styles.speedMenu}>
                                    {speeds.map(s => (
                                        <button
                                            key={s}
                                            className={`${styles.speedItem} ${s === playbackRate ? styles.speedActive : ''}`}
                                            onClick={() => setSpeed(s)}
                                        >
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className={styles.iconBtn} onClick={toggleFullscreen} title="Fullscreen (F)">
                            {fullscreen
                                ? <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
                                : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
