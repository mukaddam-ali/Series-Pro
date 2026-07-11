'use client';

import { useEffect, useState, useCallback } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import styles from './page.module.css';

export default function Home() {
  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [videos, setVideos] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch series list on mount
  useEffect(() => {
    fetch('/api/videos')
      .then(r => r.json())
      .then(data => {
        if (data.series && data.series.length > 0) {
          setSeriesList(data.series);
          setActiveSeries(data.series[0]);
        }
        setLoadingSeries(false);
      })
      .catch(() => setLoadingSeries(false));
  }, []);

  // Fetch videos when series changes
  useEffect(() => {
    if (!activeSeries) return;
    setLoadingVideos(true);
    setActiveIndex(0);
    setSearch('');
    fetch(`/api/videos?series=${encodeURIComponent(activeSeries)}`)
      .then(r => r.json())
      .then(data => {
        setVideos(data.videos ?? []);
        setLoadingVideos(false);
      })
      .catch(() => setLoadingVideos(false));
  }, [activeSeries]);

  const filtered = videos.filter(v =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const activeVideo = videos[activeIndex] ?? null;
  const streamSrc = activeVideo && activeSeries
    ? `/api/stream/${encodeURIComponent(activeSeries)}/${encodeURIComponent(activeVideo)}`
    : '';

  const goNext = useCallback(() => {
    setActiveIndex(i => Math.min(i + 1, videos.length - 1));
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setActiveIndex(i => Math.max(i - 1, 0));
  }, []);

  const pickVideo = (vid: string) => {
    const idx = videos.indexOf(vid);
    if (idx !== -1) setActiveIndex(idx);
  };

  if (loadingSeries) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading series…</p>
      </div>
    );
  }

  if (seriesList.length === 0) {
    return (
      <div className={styles.loadingScreen}>
        <p style={{ color: '#ef4444' }}>No series found.</p>
        <p style={{ color: '#475569', fontSize: '0.85rem' }}>
          Add a folder inside the <code>Videos</code> directory at the project root.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <div className={styles.brand}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="14" rx="3" fill="#6366f1" />
              <polygon points="10 8 16 11 10 14" fill="white" />
              <line x1="8" y1="21" x2="16" y2="21" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12" y2="21" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className={styles.brandName}>Series<span>Pro</span></span>
          </div>
        </div>

        {/* Series tabs */}
        <div className={styles.seriesTabs}>
          {seriesList.map(s => (
            <button
              key={s}
              className={`${styles.seriesTab} ${activeSeries === s ? styles.seriesTabActive : ''}`}
              onClick={() => setActiveSeries(s)}
              title={s}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H10V9h8v2zm-4 4H10v-2h4v2zm4-8H10V5h8v2z" />
              </svg>
              <span>{s}</span>
            </button>
          ))}
        </div>

        {/* Search + episode count */}
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search episodes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.epCountBar}>{videos.length} episodes</div>

        <div className={styles.episodeList}>
          {loadingVideos ? (
            <div className={styles.listLoader}><div className={styles.spinner} /></div>
          ) : filtered.length === 0 ? (
            <p className={styles.noResults}>No episodes found.</p>
          ) : (
            filtered.map((vid) => {
              const realIdx = videos.indexOf(vid);
              const isActive = realIdx === activeIndex;
              return (
                <button
                  key={vid}
                  className={`${styles.episodeItem} ${isActive ? styles.active : ''}`}
                  onClick={() => pickVideo(vid)}
                >
                  <div className={styles.epNum}>{realIdx + 1}</div>
                  <div className={styles.epInfo}>
                    <span className={styles.epTitle}>{vid.replace(/\.mp4$/i, '')}</span>
                  </div>
                  {isActive && (
                    <div className={styles.nowPlayingDots}>
                      <span /><span /><span />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.playerWrapper}>
          {activeVideo ? (
            <>
              <VideoPlayer
                key={`${activeSeries}/${activeVideo}`}
                src={streamSrc}
                title={activeVideo.replace(/\.mp4$/i, '')}
                onNext={goNext}
                onPrev={goPrev}
                hasNext={activeIndex < videos.length - 1}
                hasPrev={activeIndex > 0}
              />
              <div className={styles.metaBar}>
                <div className={styles.metaLeft}>
                  <span className={styles.seriesBadge}>{activeSeries}</span>
                  <span className={styles.epBadge}>Ep. {activeIndex + 1}</span>
                  <h2 className={styles.epHeading}>{activeVideo.replace(/\.mp4$/i, '')}</h2>
                </div>
                <div className={styles.metaRight}>
                  <button className={styles.navBtn} onClick={goPrev} disabled={activeIndex === 0}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                    Prev
                  </button>
                  <button className={styles.navBtn} onClick={goNext} disabled={activeIndex === videos.length - 1}>
                    Next
                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: '1rem', color: '#334155' }}>
                <rect x="3" y="3" width="18" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
              </svg>
              <p>No episodes in <strong>{activeSeries}</strong>.</p>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.4rem' }}>Add .mp4 files to the <code>Videos/{activeSeries}/</code> folder.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
