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

- Chạm vào ảnh hoặc tên video sẽ mở trình phát nhúng chính thức của YouTube với bộ điều khiển đầy đủ.
- Nút tai nghe trên từng video và nút **Nghe trong nền** khởi tạo YouTube IFrame Player API rồi yêu cầu toàn màn hình ngay trong thao tác bấm. Thanh phát của DuongTube điều khiển iframe qua các hàm `playVideo`, `pauseVideo`, `seekTo` và Media Session.
- Khi đổi chế độ, ứng dụng dừng trình phát hiện tại trước khi khởi động trình phát còn lại để tránh hai nguồn phát cùng lúc.
- Khi quay lại danh sách hoặc tìm kiếm, trình phát đang chạy thu nhỏ ở góc. Chế độ nghe giữ nguyên phiên IFrame hiện tại; trình phát video chính thức được mở lại trong khung thu nhỏ.

Khi khóa màn hình, YouTube hoặc trình duyệt có thể tạm ngắt âm thanh trong khi trạng thái iframe vẫn đang chạy. Ứng dụng không chủ động tạm dừng iframe khi PWA bị ẩn, nhờ đó phiên phát và bảng điều khiển nhạc vẫn được giữ lại. Trên thiết bị hỗ trợ, mở bảng điều khiển nhạc ở màn hình khóa và bấm **Play** để Media Session gọi lại `playVideo()`. Nếu người dùng buộc đóng hẳn PWA, tiến trình web không còn tồn tại nên không thể tiếp tục phát.

## Gợi ý nội dung

Lần mở đầu hiển thị video thịnh hành chung tại Việt Nam, không giới hạn trong danh mục âm nhạc. Sau khi người dùng tìm kiếm hoặc phát nội dung, ứng dụng lưu lịch sử trên thiết bị và trộn kết quả liên quan với danh sách thịnh hành. Đây là gợi ý cục bộ của DuongTube; ứng dụng không có quyền truy cập lịch sử hoặc hệ thống đề xuất riêng của tài khoản YouTube.

## Kiểm tra tự động

Chạy `node --test scripts/test-youtube-pwa.mjs` để kiểm tra manifest theo từng hostname, kích thước PNG, proxy, phạm vi ngoại tuyến, bỏ qua API/Range và vòng đời cập nhật. Các kiểm tra này mô phỏng service worker trong Node; cần kiểm tra trên trình duyệt thật để xác nhận cài đặt.

## Kiểm tra trên thiết bị thật

1. Mở địa chỉ HTTPS bằng Chrome Android hoặc Safari iPhone. Cài ứng dụng lên màn hình chính (trên Safari: Chia sẻ → Thêm vào Màn hình chính).
2. Mở ứng dụng đã cài; kiểm tra giao diện độc lập, icon, thanh trạng thái tối và không có thanh điều hướng của website chính.
3. Bắt đầu phát bằng thao tác chạm. Kiểm tra tạm dừng, tiếp tục, chuyển bài, tua và nút điều khiển trên màn hình khóa.
4. Khóa màn hình ít nhất hai phút và nghe qua một lần chuyển bài. Lặp lại với tiết kiệm pin bật/tắt, chuyển Wi-Fi sang dữ liệu di động và cuộc gọi đến.
5. Chạm nút micro, cho phép quyền truy cập và nói một từ khóa tiếng Việt; kiểm tra kết quả được tìm tự động.
6. Tắt mạng rồi mở lại ứng dụng để kiểm tra màn hình ngoại tuyến. Bật mạng và chọn “Thử kết nối lại”.
7. Khi có phiên bản mới, giữ ứng dụng cũ đang phát để kiểm tra không tự tải lại. Đóng/mở lại ứng dụng hoặc chủ động cập nhật để nhận bản mới.

Khả năng duy trì phát khi khóa màn hình phụ thuộc nguồn âm thanh, trình duyệt và chính sách tiết kiệm pin của hệ điều hành. Cài đặt PWA và Media Session không tự biến trình phát nhúng YouTube thành trình phát nền. Chỉ xác nhận đạt yêu cầu khóa màn hình sau khi kiểm tra bằng nguồn phát thực tế trên thiết bị đích.
