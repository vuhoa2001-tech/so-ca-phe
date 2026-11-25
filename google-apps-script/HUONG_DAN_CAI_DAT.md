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
- ⚠ Mã máy đã bị khóa hoặc sai – báo chủ (đỏ): máy đang dùng mã riêng bị khóa hoặc mã không đúng.

## Lưu ý
- **Không sửa hoặc xóa** cột "Mã (id)", "Cập nhật lúc" và cột cuối "Dữ liệu JSON" trong bảng tính; các cột còn lại chỉ để đọc. Muốn sửa số liệu hãy sửa trong app.
- Khi sửa mã `Code.gs` sau này: **Triển khai → Quản lý bản triển khai → biểu tượng bút chì → Phiên bản: Phiên bản mới → Triển khai** (URL giữ nguyên).
- Đổi mã đồng bộ: sửa trong Code.gs, triển khai lại như trên, rồi nhập mã mới vào app.
- Khôi phục từ file sao lưu trên một máy sẽ không xóa dữ liệu cũ đã có trên bảng tính; nên khôi phục trước khi bật đồng bộ.

## Mã riêng cho từng người
Thay vì cả nhà dùng chung một mã, **mỗi người (chủ hoặc nhân viên) có mã riêng** do chủ cấp. Máy chủ nhận ra người theo mã, tên người nhập lấy từ máy chủ (không gõ giả được) và **quyền được kiểm tra ngay trên máy chủ** (sửa app trên điện thoại cũng không vượt quyền được).

### Cách chuyển sang mã riêng (làm theo thứ tự)
1. Mở Apps Script, dán **toàn bộ `Code.gs` mới** thay nội dung cũ. **Giữ nguyên mã của bạn ở dòng 9** (`var MA_DONG_BO = '...'`), kiểm tra dòng 11 là `var CHO_PHEP_MA_CHUNG = true;`. Bấm **Lưu**.
2. **Triển khai → Quản lý bản triển khai → biểu tượng bút chì → Phiên bản: Phiên bản mới → Triển khai** (URL giữ nguyên).
3. Trên **máy của chủ** (đang dùng mã chung cũ): vào **Chế độ đầy đủ → Hệ thống → Người dùng & mã máy** (hoặc **Cài đặt → 👥 Người dùng & mã máy** ở chế độ dễ dùng; cần PIN chủ). Trang tính **Người dùng** sẽ tự được tạo trong bảng tính.
4. Bấm **+ Thêm người**, nhập tên của chủ, vai trò **Chủ** → hiện **mã riêng của chủ** (dạng `XXXX-XXXX-XXXX`, chỉ hiện một lần). Bấm **🔗 Sao chép link kết nối**, mở link đó trên chính máy này (hoặc bấm **Kết nối máy** và nhập địa chỉ + mã) → **✓ Kết nối**. Máy chủ từ giờ dùng mã riêng.
5. Với **mỗi nhân viên**: **+ Thêm người** (vai trò **Nhân viên**) → bấm **📤 Gửi qua Zalo** (hoặc chép link) → **mở link trên điện thoại của nhân viên, chủ đứng cạnh** → **✓ Kết nối**. Tên nhân viên hiện sẵn, không gõ được. **Xóa tin nhắn chứa link/mã** sau khi nhân viên đã kết nối.
6. Khi **mọi máy** (kể cả máy tính, máy của chủ) đã chuyển sang mã riêng: trong Apps Script đổi thành `var CHO_PHEP_MA_CHUNG = false;`, **Lưu**, rồi **Triển khai → Phiên bản mới**. Từ lúc này mã chung cũ hết tác dụng.

### Khi nhân viên nghỉ việc hoặc mất điện thoại
Vào **Người dùng & mã máy** → bấm **Khóa** ở dòng người đó. Máy của họ lập tức không đồng bộ được nữa (nhãn đỏ "Mã máy đã bị khóa hoặc sai"). Cần cấp lại thì bấm **Mở lại** hoặc **Tạo mã mới** (mã cũ hết dùng).

### Nhân viên làm được gì, không làm được gì
- Làm được: tạo phiếu mới (thu mua, đổi cà, trả nhân, bán, nhập kho, ký gửi, ứng tiền, thu/chi, chốt quỹ, khách mới); **sửa phiếu do chính mình nhập trong ngày hôm nay**; sửa số điện thoại / địa chỉ / ghi chú của khách.
- Không làm được: **xóa bất cứ thứ gì**; sửa phiếu ngày cũ hoặc phiếu người khác nhập; sửa cài đặt, số dư đầu kỳ, kiểm kê, loại cà, điều chỉnh kho, nhật ký; sửa phiếu chốt quỹ đã lưu; quản lý người dùng. Nếu cố làm, máy chủ từ chối, app hiện thông báo đỏ và tự hoàn lại như trên máy chủ. Muốn sửa/xóa: báo chủ.
- Nhân viên không có PIN chủ và không mở được các chức năng của chủ trên máy của họ ("Chức năng này chỉ dùng trên máy của chủ").
- Ghi chú: đổi tên một nhân viên thì phiếu hôm nay họ đã nhập dưới tên cũ sẽ không tự sửa được nữa (báo chủ).

## Bật sao lưu tự động hằng ngày (Google Drive)
Phần này giúp Sổ tự động lưu một bản sao vào Google Drive mỗi đêm, để lỡ có sự cố vẫn còn bản dự phòng.

1. Mở lại Apps Script của bảng tính (Tiện ích mở rộng → Apps Script).
2. Dán toàn bộ file `Code.gs` mới vào, thay thế nội dung cũ.
3. **Quan trọng:** dòng số 9 (`var MA_DONG_BO = ...`) đang là chữ mẫu. Hãy gõ lại mã đồng bộ của bạn vào giữa hai dấu nháy ' ' (đúng như mã đã nhập trong app).
4. Bấm **Lưu** (Ctrl+S).
5. Trên thanh công cụ, ở ô chọn hàm (ngay cạnh nút **Gỡ lỗi** / **Chạy**), chọn hàm **caiDatSaoLuuTuDong**, rồi bấm **Chạy**.
6. Lần đầu, Google sẽ hỏi quyền truy cập Google Drive:
   - Bấm **Xem xét quyền** → chọn tài khoản Gmail của bạn.
   - Nếu hiện cảnh báo "Google chưa xác minh ứng dụng này": bấm **Nâng cao** → **Chuyển đến Sổ Cà Phê (không an toàn)** → **Cho phép**.
7. Chờ đến khi dưới cùng hiện **Đã hoàn tất thực thi**.
8. Mở **Google Drive** (drive.google.com), tìm thư mục **Sao lưu Sổ Cà Phê**. Trong đó sẽ có bản sao đầu tiên, tên dạng `Sổ Cà Phê – sao lưu 2026-11-25 1530`.

Từ đó, **mỗi đêm khoảng 23 giờ** máy tự tạo thêm một bản sao. Thư mục chỉ giữ **30 bản mới nhất**; bản cũ hơn sẽ được chuyển vào **Thùng rác** của Drive (không mất hẳn, có thể lấy lại trong thời hạn của Thùng rác).

- **Tắt** sao lưu tự động: chọn hàm **tatSaoLuuTuDong** ở ô chọn hàm rồi bấm **Chạy**.
- **Lấy lại dữ liệu** từ một bản sao: mở bản sao trong thư mục Drive để xem số liệu. Nếu cần khôi phục toàn bộ Sổ, hãy nhờ người kỹ thuật hỗ trợ.

**Nhớ:** mỗi khi sửa `Code.gs`, phải triển khai phiên bản mới để app và sao lưu chạy đúng mã mới: **Triển khai → Quản lý bản triển khai → biểu tượng bút chì → Phiên bản: Phiên bản mới → Triển khai** (URL giữ nguyên).
