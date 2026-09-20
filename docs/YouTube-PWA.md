# DuongTube PWA

Ứng dụng chạy ở `https://youtube.duongnt.io.vn/`. Bản xem thử trên máy chạy tại `/youtube`. Proxy của Next.js 16 tách giao diện DuongTube khỏi thanh điều hướng, chân trang và truy vấn theme của website chính.

## Cài đặt và phạm vi

Manifest tại `/youtube-manifest.webmanifest` trả về `start_url` và `scope` theo hostname:

| Địa chỉ | Phạm vi service worker | Trang mở khi cài đặt |
| --- | --- | --- |
| `youtube.duongnt.io.vn`, `youtube.localhost` | `/` | `/?source=pwa` |
| Website chính hoặc `localhost` | `/youtube` | `/youtube?source=pwa` |

Đăng ký `/youtube-sw.js` với phạm vi tương ứng và `updateViaCache: "none"`. Khi chuyển từ bản cũ, hủy đăng ký worker DuongTube có phạm vi `/` trên website chính trước khi đăng ký phạm vi `/youtube`. Không hủy các worker của ứng dụng khác.

Manifest cung cấp icon PNG 192 × 192, PNG 512 × 512, icon maskable 512 × 512 và icon Apple 180 × 180. Nền ứng dụng là `#0f0f0f`.

Worker chỉ lưu trang thông báo ngoại tuyến và các icon. Không lưu API, phản hồi âm thanh, yêu cầu Range hoặc các tệp JavaScript của Next.js. Khi mất mạng và tải lại trang, ứng dụng hiển thị thông báo cần kết nối mạng; đây không phải tính năng tải nhạc để nghe ngoại tuyến.

Worker mới chờ đến khi ứng dụng cũ đóng. Có thể chủ động áp dụng worker đang chờ bằng `registration.waiting.postMessage({ type: "SKIP_WAITING" })`, sau khi người dùng chọn cập nhật. Không tự tải lại trang trong lúc đang phát nhạc.

## Trình phát video

- Chạm vào ảnh hoặc tên video sẽ phát ngay bằng YouTube IFrame Player API với bộ điều khiển đầy đủ.
- DuongTube chỉ tạo một iframe phát video cho toàn bộ phiên sử dụng. Khi quay lại danh sách, đổi mục hoặc tìm kiếm, chính iframe đó được thu nhỏ xuống góc nên video không tải lại và không quay về đầu.
- Thanh điều khiển phía dưới gọi trực tiếp các hàm `playVideo`, `pauseVideo`, `seekTo`, chuyển video và điều chỉnh âm lượng trên cùng trình phát.
- Chế độ nghe âm thanh trong nền và nút tai nghe riêng đã được loại bỏ.

## Gợi ý nội dung

Lần mở đầu hiển thị video thịnh hành chung tại Việt Nam, không giới hạn trong danh mục âm nhạc. Thứ tự gợi ý được trộn lại khi mở ứng dụng hoặc chọn lại một chủ đề, nên các hàng **Tất cả**, **Âm nhạc**, **Nhạc Việt** và các chủ đề khác không còn luôn lặp lại cùng một nhóm video mẫu. Sau khi người dùng tìm kiếm hoặc phát nội dung, ứng dụng lưu lịch sử trên thiết bị và trộn kết quả liên quan với danh sách thịnh hành. Đây là gợi ý cục bộ của DuongTube; ứng dụng không có quyền truy cập lịch sử hoặc hệ thống đề xuất riêng của tài khoản YouTube.

## Tìm kiếm và bố cục

- Nhận dạng giọng nói dùng một câu tiếng Việt mỗi lần. Ngay khi nhận được kết quả cuối, ứng dụng dừng phiên nhận dạng và nhả micro trước khi thực hiện tìm kiếm.
- Trang khóa tràn ngang ở cấp ứng dụng, nội dung và lưới video. Thanh chủ đề vẫn có thể cuộn ngang bên trong chính thanh đó trên màn hình hẹp.

## Kiểm tra tự động

Chạy `node --test scripts/test-youtube-pwa.mjs` để kiểm tra manifest theo từng hostname, kích thước PNG, proxy, phạm vi ngoại tuyến, bỏ qua API/Range và vòng đời cập nhật. Các kiểm tra này mô phỏng service worker trong Node; cần kiểm tra trên trình duyệt thật để xác nhận cài đặt.

## Kiểm tra trên thiết bị thật

1. Mở địa chỉ HTTPS bằng Chrome Android hoặc Safari iPhone. Cài ứng dụng lên màn hình chính (trên Safari: Chia sẻ → Thêm vào Màn hình chính).
2. Mở ứng dụng đã cài; kiểm tra giao diện độc lập, icon, thanh trạng thái tối và không có thanh điều hướng của website chính.
3. Chạm một video và xác nhận video tự phát ngay, sau đó kiểm tra tạm dừng, tiếp tục, chuyển video, tua và âm lượng.
4. Trong lúc video đang phát, tìm kiếm từ khóa mới. Xác nhận video thu nhỏ xuống góc, thời gian tiếp tục chạy và khi mở rộng không quay lại từ đầu.
5. Chạm nút micro, cho phép quyền truy cập và nói một từ khóa tiếng Việt; kiểm tra kết quả được tìm tự động, biểu tượng nghe biến mất và micro được nhả ngay.
6. Tắt mạng rồi mở lại ứng dụng để kiểm tra màn hình ngoại tuyến. Bật mạng và chọn “Thử kết nối lại”.
7. Khi có phiên bản mới, giữ ứng dụng cũ đang phát để kiểm tra không tự tải lại. Đóng/mở lại ứng dụng hoặc chủ động cập nhật để nhận bản mới.
