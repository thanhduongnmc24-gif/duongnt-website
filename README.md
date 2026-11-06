This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## LINE Bot cho báo cáo DMX

Website cung cấp hai Route Handler dành cho Cloudflare LINE Bot:

- `GET /api/dmx/bot/bao-cao?loai=thidua`: trả nội dung chữ và URL ảnh PNG ký ngắn hạn.
- `GET /api/dmx/bot/anh`: dựng ảnh PNG trực tiếp từ dữ liệu DMX trong Supabase.

Các loại báo cáo được hỗ trợ: `tongquan`, `doanhthu`, `realtime`, `luyke`, `thidua`, `nhanvien`.

Khai báo các biến môi trường bí mật trên máy chủ triển khai website, không dùng tiền tố `NEXT_PUBLIC`:

```text
DMX_BOT_API_TOKEN=<chuỗi bí mật dùng giữa Cloudflare và website>
DMX_BOT_SIGNING_SECRET=<chuỗi bí mật khác để ký URL ảnh>
DMX_BOT_USERNAME=<tên đăng nhập DMX cần lấy dữ liệu>
```

Có thể dùng `DMX_BOT_USER_ID=<UUID Supabase>` thay cho `DMX_BOT_USERNAME`. Cloudflare gọi API bằng header `Authorization: Bearer <DMX_BOT_API_TOKEN>`. URL ảnh do API trả về chỉ có hiệu lực 15 phút và không cần gửi khóa bí mật cho máy chủ ảnh của LINE.

Mã Worker được lưu tại `cloudflare/dmx-line-bot.js`. Trên Cloudflare cần cấu hình thêm:

```text
DMX_REPORT_API_URL=https://www.duongnt.io.vn/api/dmx/bot/bao-cao
DMX_API_TOKEN=<cùng giá trị DMX_BOT_API_TOKEN trên website>
```

Worker sẽ gửi tối đa hai message cho mỗi lệnh báo cáo: nội dung văn bản và ảnh PNG do website tạo.
