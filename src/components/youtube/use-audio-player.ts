import { useState, useEffect, useRef } from 'react';

interface MediaInfo {
  title?: string;
  artist?: string;
  artwork?: string;
}

export function useAudioPlayer(videoId: string, mediaInfo?: MediaInfo) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = `/api/youtube/audio?videoId=${videoId}`;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.pause();
    };
  }, [videoId]);

  // Cấu hình Media Session API để hiển thị trình điều khiển ngoài màn hình khóa và giữ nền
  useEffect(() => {
    if ('mediaSession' in navigator && mediaInfo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: mediaInfo.title || 'Đang phát',
        artist: mediaInfo.artist || 'YouTube Background',
        album: 'Dự án của anh hai',
        artwork: mediaInfo.artwork ? [{ src: mediaInfo.artwork, sizes: '512x512', type: 'image/jpeg' }] : []
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        audioRef.current?.pause();
      });
    }
  }, [mediaInfo]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Lỗi phát âm thanh:", e));
      }
    }
  };

  return { isPlaying, isLoading, togglePlay, audioRef };
}