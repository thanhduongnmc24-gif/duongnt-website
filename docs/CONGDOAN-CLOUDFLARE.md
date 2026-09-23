# Đưa Công đoạn lên `congdoan.duongnt.io.vn`

Ứng dụng dùng lại dịch vụ Render hiện tại. Cloudflare Worker nhận tên miền mới rồi chuyển tiếp yêu cầu sang Render, vì vậy không cần thêm tên miền thứ ba trong Render.

## Thiết lập một lần trên Cloudflare

1. Vào **Workers & Pages**, tạo một Worker mới và dán nội dung file `docs/congdoan-cloudflare-worker.js`.
2. Deploy Worker, mở **Settings → Domains & Routes → Add → Custom domain**.
3. Nhập `congdoan.duongnt.io.vn` và xác nhận. Cloudflare sẽ tự tạo bản ghi DNS được proxy.
4. Không tạo thêm custom domain trong Render. Worker dùng địa chỉ gốc `duongnt-website.onrender.com` đã có sẵn.

Sau khi DNS có hiệu lực, mở `https://congdoan.duongnt.io.vn`. Manifest, service worker và đường dẫn khởi động đều được trả về ở gốc subdomain để có thể cài như một PWA độc lập.
