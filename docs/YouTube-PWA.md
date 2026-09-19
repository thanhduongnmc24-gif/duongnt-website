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

## Hai chế độ phát

- Chạm vào ảnh hoặc tên video sẽ mở trình phát nhúng chính thức của YouTube. Đây là chế độ mặc định và không gọi dịch vụ lấy nguồn âm thanh. Iframe dùng các tham số chính thức `controls=0`, `enablejsapi=1`, `fs=0` và `iv_load_policy=3` để thu gọn giao diện.
- Nút tai nghe trên từng video và nút **Nghe trong nền** trong trang xem mới gọi `/api/youtube/audio`. Luồng này dùng mô hình của YTAudio: trình phát PWA dùng Media Session, còn dịch vụ nguồn riêng phân giải và chuyển tiếp tệp âm thanh. Nếu nguồn trực tiếp thất bại, máy chủ thử đồng thời Piped và Invidious rồi mới trả lỗi gốc.
- Khi đổi chế độ, ứng dụng dừng trình phát hiện tại trước khi khởi động trình phát còn lại để tránh hai nguồn phát cùng lúc.

Danh sách API dự phòng được cấu hình bằng `PIPED_API_INSTANCES` và `INVIDIOUS_API_INSTANCES`, phân tách nhiều địa chỉ bằng dấu phẩy. Các instance công khai thay đổi trạng thái thường xuyên; cần kiểm tra lại từ máy chủ triển khai thay vì coi một địa chỉ mặc định là luôn hoạt động.

## Kiểm tra tự động

Chạy `node --test scripts/test-youtube-pwa.mjs` để kiểm tra manifest theo từng hostname, kích thước PNG, proxy, phạm vi ngoại tuyến, bỏ qua API/Range và vòng đời cập nhật. Các kiểm tra này mô phỏng service worker trong Node; cần kiểm tra trên trình duyệt thật để xác nhận cài đặt.

## Kiểm tra trên thiết bị thật

1. Mở địa chỉ HTTPS bằng Chrome Android hoặc Safari iPhone. Cài ứng dụng lên màn hình chính (trên Safari: Chia sẻ → Thêm vào Màn hình chính).
2. Mở ứng dụng đã cài; kiểm tra giao diện độc lập, icon, thanh trạng thái tối và không có thanh điều hướng của website chính.
3. Bắt đầu phát bằng thao tác chạm. Kiểm tra tạm dừng, tiếp tục, chuyển bài, tua và nút điều khiển trên màn hình khóa.
4. Khóa màn hình ít nhất hai phút và nghe qua một lần chuyển bài. Lặp lại với tiết kiệm pin bật/tắt, chuyển Wi-Fi sang dữ liệu di động và cuộc gọi đến.
5. Tắt mạng rồi mở lại ứng dụng để kiểm tra màn hình ngoại tuyến. Bật mạng và chọn “Thử kết nối lại”.
6. Khi có phiên bản mới, giữ ứng dụng cũ đang phát để kiểm tra không tự tải lại. Đóng/mở lại ứng dụng hoặc chủ động cập nhật để nhận bản mới.

Khả năng duy trì phát khi khóa màn hình phụ thuộc nguồn âm thanh, trình duyệt và chính sách tiết kiệm pin của hệ điều hành. Cài đặt PWA và Media Session không tự biến trình phát nhúng YouTube thành trình phát nền. Chỉ xác nhận đạt yêu cầu khóa màn hình sau khi kiểm tra bằng nguồn phát thực tế trên thiết bị đích.
