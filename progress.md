# Nhật ký phát triển: Dashboard Luật sư (AI for Wife)

## ✅ Các tính năng đã hoàn thành thành công:

1.  **Tái cấu trúc mã nguồn chuyên nghiệp:**
    *   Tách riêng HTML, CSS (style chung & đồng hồ mèo riêng), và JavaScript (main logic).
    *   Sử dụng cơ chế **Cache Buster** (`?v=timestamp`) để đảm bảo trình duyệt luôn nạp code mới nhất.

2.  **Đồng hồ mèo (Cat Clock) - Hoàn thiện 100%:**
    *   **Hiệu ứng:** Chớp mắt, ngoe nguẩy đuôi sinh động.
    *   **Kéo thả (Draggable):** Sử dụng logic Delta-Movement siêu mượt, không bị lệch con trỏ.
    *   **Lưu vị trí:** Tự động ghi nhớ vị trí người dùng đã đặt để hiển thị lại đúng chỗ sau khi F5.

3.  **Hệ thống Soạn thảo & Ghi chú:**
    *   Hỗ trợ Markdown hoàn chỉnh.
    *   Tự động lưu nội dung vào LocalStorage (không sợ mất dữ liệu khi đóng trình duyệt).
    *   Tab "Xem trước" render Markdown thời gian thực.

4.  **Quản lý việc cần làm (To-do List):**
    *   Thêm mới, đánh dấu hoàn thành (gạch ngang), xóa từng mục.
    *   Lưu trữ trạng thái bền vững.

5.  **Giao diện (UI/UX):**
    *   Dark mode / Light mode mượt mà.
    *   Chế độ tập trung (Focus mode) ẩn sidebar để tối ưu không gian viết.
    *   Sửa lỗi kích thước hiển thị bị phóng to/thu nhỏ bất thường.

---

## 🛰️ Hệ thống Radar Pháp luật (Đang xử lý):

- **Đã làm:**
    - Chuyển sang nguồn dữ liệu uy tín: **Thư Viện Pháp Luật (RSS)**.
    - Layout 3 cột: Văn bản mới, Dự thảo, Công văn.
    - Cơ chế **Stealth Radar (Proxy Roulette)**: Xoay vòng qua 4 cổng proxy khác nhau để lách rào cản CORS.
    - Hệ thống **Log Debug**: Hiển thị báo cáo trạng thái quét ngay trên giao diện.

- **Vấn đề tồn tại:**
    - **XML Corrupted:** Một số proxy trả về dữ liệu lỗi (Oops...) hoặc Thư Viện Pháp Luật chặn các yêu cầu từ Cloud Proxy phổ thông.
    - **Lỗi CORS:** Vẫn là rào cản lớn nhất khi chạy ứng dụng từ file HTML cục bộ mà không qua Server.

---

## 🛠 Hướng dẫn khắc phục nhanh cho người dùng:
Để radar pháp luật chạy 100% ổn định, hãy cài tiện ích mở rộng **"Allow CORS: Access-Control-Allow-Origin"** trên trình duyệt Chrome/Edge của bạn.
