# Cài đặt đồng bộ Google Sheets (làm một lần, khoảng 10 phút)

Mục đích: dữ liệu nhập trên điện thoại/máy tính được gửi lên một bảng Google Sheets của bạn để lưu an toàn và xem được trực tiếp. App vẫn nhập được khi mất mạng; khi có mạng sẽ tự gửi.

Bạn cần một tài khoản Google (Gmail).

## Bước 1. Tạo bảng tính
1. Vào https://sheets.google.com và đăng nhập Gmail.
2. Bấm **Trống** (Blank) để tạo bảng tính mới.
3. Đặt tên ở góc trên bên trái, ví dụ: **Sổ Cà Phê**.

## Bước 2. Mở Apps Script và dán mã
1. Trên thanh menu của bảng tính bấm **Tiện ích mở rộng** (Extensions) → **Apps Script**.
2. Một cửa sổ mới mở ra. Trong ô soạn thảo, xóa hết chữ đang có (thường là `function myFunction() {}`).
3. Mở file `Code.gs` trong thư mục `google-apps-script` (bằng Notepad), chọn tất cả (Ctrl+A), sao chép (Ctrl+C) rồi dán (Ctrl+V) vào Apps Script.

## Bước 3. Đặt MÃ ĐỒNG BỘ
1. Ở gần đầu mã, tìm dòng: `var MA_DONG_BO = 'DOI-MA-NAY';`
2. Thay chữ `DOI-MA-NAY` (giữ nguyên hai dấu nháy ' ') bằng một mã bí mật của bạn, ví dụ `cafe-2026-Xk93pQ`. Nên dài từ 12 ký tự, gồm chữ và số, không dùng dấu cách.
3. Ghi lại mã này ra giấy. Mã này **chính là thứ bảo vệ dữ liệu của bạn**: ai biết địa chỉ + mã thì đọc và ghi được dữ liệu. Đừng đăng lên mạng xã hội.
4. Bấm biểu tượng đĩa mềm **Lưu dự án** (hoặc Ctrl+S).

## Bước 4. Triển khai (Deploy)
1. Bấm nút xanh **Triển khai** (Deploy) ở góc trên bên phải → **Tùy chọn triển khai mới** (New deployment).
2. Bấm biểu tượng bánh răng bên cạnh "Chọn loại" → chọn **Ứng dụng web** (Web app).
3. Điền:
   - Mô tả: `Sổ Cà Phê`
   - **Thực thi với tư cách** (Execute as): **Tôi** (Me)
   - **Người có quyền truy cập** (Who has access): **Bất kỳ ai** (Anyone)
4. Bấm **Triển khai** (Deploy).
5. Lần đầu Google yêu cầu cấp quyền: bấm **Cấp quyền truy cập** → chọn tài khoản của bạn. Nếu hiện cảnh báo "Google chưa xác minh ứng dụng này": bấm **Nâng cao** (Advanced) → **Chuyển đến Sổ Cà Phê (không an toàn)** → **Cho phép**. (Đây là mã do chính bạn dán nên an toàn.)
6. Sau khi xong sẽ hiện **URL ứng dụng web** (bắt đầu bằng `https://script.google.com/macros/s/.../exec`). Bấm **Sao chép** (Copy).
7. Kiểm tra: dán URL đó vào trình duyệt, nếu thấy dòng chữ "Sổ Cà Phê - máy chủ đồng bộ đang chạy OK" là thành công.

## Bước 5. Nhập vào app
1. Mở app (ở **Chế độ đầy đủ**, nút ở góc trên) → **Cài đặt** → mục **Đồng bộ qua Google Sheets**.
2. Dán URL vào ô **Địa chỉ đồng bộ**, gõ **Mã đồng bộ** đúng như đã đặt ở bước 3.
3. Bấm **Lưu và đồng bộ**. Góc trên màn hình sẽ hiện **✓ Đã lưu lên mạng** (màu xanh). Mở bảng tính Google sẽ thấy các tab: Thu mua, Đổi cà, Trả nhân, Sổ quỹ, Khách hàng...
4. Làm tương tự trên mỗi điện thoại/máy tính khác (dùng cùng URL và cùng mã).

## Ý nghĩa nhãn ở góc trên
- ✓ Đã lưu lên mạng (xanh): mọi thứ đã gửi.
- ⏳ Chờ gửi (3) (vàng): còn 3 mục chưa gửi, sẽ tự gửi khi có mạng.
- ⚠ Mất mạng – vẫn lưu trên máy (xám): cứ nhập bình thường.
- ⚠ Sai mã đồng bộ (đỏ): kiểm tra lại mã.

## Lưu ý
- **Không sửa hoặc xóa** cột "Mã (id)", "Cập nhật lúc" và cột cuối "Dữ liệu JSON" trong bảng tính; các cột còn lại chỉ để đọc. Muốn sửa số liệu hãy sửa trong app.
- Khi sửa mã `Code.gs` sau này: **Triển khai → Quản lý bản triển khai → biểu tượng bút chì → Phiên bản: Phiên bản mới → Triển khai** (URL giữ nguyên).
- Đổi mã đồng bộ: sửa trong Code.gs, triển khai lại như trên, rồi nhập mã mới vào app.
- Khôi phục từ file sao lưu trên một máy sẽ không xóa dữ liệu cũ đã có trên bảng tính; nên khôi phục trước khi bật đồng bộ.
