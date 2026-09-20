#!/data/data/com.termux/files/usr/bin/bash
set -eu

pkg update -y
pkg install -y python nodejs curl
python -m pip install -U yt-dlp
mkdir -p "$HOME/.duongtube"
curl -fsSL "https://youtube.duongnt.io.vn/youtube-helper/duongtube-helper.py" -o "$HOME/.duongtube/duongtube-helper.py"
termux-wake-lock 2>/dev/null || true
echo "Đã cài DuongTube helper. Giữ Termux mở khi nghe nhạc."
exec python "$HOME/.duongtube/duongtube-helper.py"
