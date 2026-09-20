import { useState, useEffect, useRef } from 'react';

export function useAudioPlayer(videoId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // [Suy luận] Khởi tạo thẻ audio native trực tiếp trong JS sẽ giúp trình duyệt di động (iOS/Android) 
    // nhận diện đây là luồng media tiêu chuẩn và cấp quyền chạy nền tốt hơn so với iframe.
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "metadata";
      // Trỏ URL tới proxy API của dự án thay vì link YouTube gốc để lách luật CORS và chặn luồng
      audio.src = `/api/youtube/audio?videoId=${videoId}`; 
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);

    // Lắng nghe các sự kiện của thẻ audio native
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

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // [Suy luận] Cần gọi .play() trực tiếp từ một tương tác chạm/click của người dùng 
        // thì hệ điều hành mới không block quyền phát âm thanh.
        audioRef.current.play().catch(e => console.error("Lỗi phát âm thanh:", e));
      }
    }
  };

  return { isPlaying, isLoading, togglePlay, audioRef };
}