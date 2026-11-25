# Hướng dẫn sử dụng Sổ sách cà phê

## Mở ứng dụng
Nhấp đúp file `index.html` (mở bằng Chrome hoặc Edge). Không cần mạng. Dữ liệu lưu ngay trong trình duyệt trên máy này, vì vậy **hãy dùng cùng một trình duyệt** mỗi lần và **sao lưu mỗi tuần**.

Góc trên bên phải có ô **Người nhập**: gõ tên bạn, mỗi phiếu sẽ ghi lại ai là người nhập.

## Lần đầu dùng
1. **Cài đặt**: nhập tên cơ sở, địa chỉ, SĐT (in trên phiếu), tỷ lệ đổi mặc định (4,6), quỹ tiền mặt đầu kỳ, tồn kho đầu theo loại. Bấm *Lưu cài đặt*.
2. Muốn đưa dữ liệu Excel cũ vào: chạy `python nhap_tu_excel.py` (tạo file `du-lieu-tu-excel.json`), rồi vào **Cài đặt → Khôi phục từ file JSON** và chọn file đó. (Lưu ý: khôi phục sẽ thay thế toàn bộ dữ liệu đang có. Dữ liệu trong file "Sổ Đổi Cà" là dữ liệu mẫu nên không được nhập.)

## Việc hằng ngày
- **Thu mua**: chọn ngày, gõ/chọn người bán (nút **+** để thêm khách mới; gõ tên mới cũng tự tạo), chọn loại, đơn giá. Cân từng bao: gõ số cân rồi Enter (hoặc bấm *+ Thêm bao*); app tự tính số bao, tổng cả bì, trừ bì, KL tịnh. Không cân từng bao thì nhập thẳng KL tịnh. Nhập *Đã trả ngay* (hoặc bấm **Trả đủ**) rồi *Lưu phiếu*. Tiền trả ngay tự vào Sổ quỹ.
- **Đổi cà**: nhập cà tươi khách giao; app tính nhân phải trả theo tỷ lệ (có thể nhập tỷ lệ riêng). Mục **Trả nhân cho khách** dùng khi trả nhân dần: trả bằng nhân (trừ kho nhân xô) hoặc quy ra tiền (tự chi tiền trong Sổ quỹ).
- **Bán ra / Kho**: ghi bán cho công ty, và *Chế biến / điều chỉnh kho* (ví dụ quả tươi -> nhân xô, hoặc hao hụt).
- **Sổ quỹ**: ghi thu chi khác (lương, vận chuyển...). Các khoản tự sinh từ phiếu chỉ sửa ở phiếu gốc.
- **Công nợ**: xem ai còn nợ; nút *Trả tiền / Thu tiền / Trả nhân* điền sẵn biểu mẫu; *Chi tiết* xem và in sổ chi tiết từng khách.
- **Báo cáo**: tổng hợp theo ngày của tháng, thu chi và lãi lỗ ước tính theo khoảng ngày, theo khách.
- Mọi danh sách có nút **Xuất Excel**; phiếu có nút **In phiếu** (khổ A5).

## Nhập kho, Kiểm kê và Lãi tháng
**Loại cà:** chỉ còn hai loại là **Cà tươi** và **Nhân xô**. Cà khô (quả khô) đã bỏ, không cần nhập nữa.

**Trừ bì:** bước **Trừ bì** luôn hiện, kể cả khi bạn chỉ nhập tổng khối lượng. Công thức: KL tịnh = tổng cả bì - số kg trừ.

**Nhập kho (ô 📦):** dùng sau khi sấy hoặc xay xong, để ghi nhân xô đưa vào kho. Các bước:
1. Chọn ngày.
2. Chọn cách làm: **Phơi sân**, **Đốt lò** hoặc **Cả hai**.
3. Cân từng bao, hoặc nhập tổng khối lượng.
4. Nhập số kg trừ bì.
5. Bấm lưu. Có thể in phiếu NK để lưu giấy.

**Kiểm kê (ô 📋, dành cho chủ):**
- Cuối mỗi tháng, nhập số **cà tươi còn lại** (ước lượng). Nếu hết thì chọn **Hết cà tươi**.
- Có thể nhập thêm **số nhân đếm thực tế** để so với số trên sổ.
- Khi sân hết cà tươi, chọn **Chốt kho** (sân trống). Lúc này tỷ lệ tươi/nhân mới chính xác.
- **Bắt buộc kiểm kê ngày 31/12** để tổng kết năm.

**Lãi tháng:**
- Lãi tháng chỉ hiện sau khi tháng đó đã kiểm kê. Trước đó app ghi **Chờ kiểm kê**.
- App không dùng tỷ lệ giả định để ước lãi, nên số liệu luôn dựa trên kiểm kê thực tế.

**Chi phí:** chia thành hai nhóm.
- **Chi phí chế biến:** Nhân công (lương tháng do chủ nhập); Củi, điện lò sấy; Điện, sửa máy xay; Bao bì, vận chuyển.
- **Chi phí chung:** Thuê kho; Điện sinh hoạt; Chi phí khác.
- **Rút vốn / chi cá nhân** không tính vào chi phí.

**Báo cáo:**
- **Lãi tháng** và **Tổng kết năm** (tính theo năm dương lịch).
- Biểu đồ lãi theo tháng.
- Biểu đồ tỷ lệ tươi/nhân so với tỷ lệ đổi 4,6.

**Cập nhật Google Sheets (làm một lần cho bản mới):**
1. Mở Apps Script của Google Sheet, dán lại toàn bộ file `Code.gs` mới. Dòng `MA_DONG_BO` phải giữ đúng mã của bạn: sửa phần còn lại, hoặc dán mới rồi gõ lại mã.
2. Bấm **Lưu**.
3. Bấm **Triển khai → Quản lý bản triển khai**, bấm biểu tượng **bút chì**, chọn **Phiên bản: Phiên bản mới**, rồi bấm **Triển khai**.
4. Sau khi xong, Google Sheet sẽ có thêm hai tab **Nhập kho** và **Kiểm kê**.

## Sao lưu / Khôi phục
- **Cài đặt → Sao lưu** tải file `sao-luu-ca-phe-YYYY-MM-DD.json`. Nên chép file này sang USB hoặc gửi qua Zalo/Drive.
- **Khôi phục** chọn lại file đó (sẽ thay thế dữ liệu hiện có). Tổng quan sẽ nhắc nếu quá 7 ngày chưa sao lưu.
- Xóa dữ liệu trình duyệt (cookie/site data) sẽ mất sổ, nếu chưa sao lưu.

## Cách tính
- KL tịnh = tổng cân cả bì - số bao x bì. Thành tiền = làm tròn(KL x đơn giá). Nhân phải trả = làm tròn 2 số lẻ(tươi / tỷ lệ).
- Công nợ tiền = thành tiền - đã trả - các khoản "Trả nợ người bán" ghi trong Sổ quỹ. Nợ nhân = nhân phải trả - nhân đã trả.
- Tồn kho = tồn đầu + mua - bán + chế biến/điều chỉnh; cà tươi nhận khi đổi cộng vào kho quả tươi; trả nhân bằng nhân trừ kho nhân xô.
- Lãi gộp = doanh thu bán - KL bán x giá mua bình quân của loại đó. Chi phí vận hành không tính ở đây: tiền mua cà, trả nợ người bán, rút vốn. Lãi tháng đầy đủ (có trừ chi phí) xem mục **Nhập kho, Kiểm kê và Lãi tháng**.

## Chế độ dễ dùng (mặc định) và Chế độ đầy đủ
- Khi mở app sẽ thấy **màn hình chính với các ô lớn**: Mua cà, Đổi cà, Trả nhân, Thu / Chi, Xem nợ, Hôm nay, Báo cáo, Cài đặt. Mỗi việc làm từng bước một, có nút lớn "Tiếp" và "Quay lại"; số cân được bấm bằng bàn phím số trên màn hình.
- Mục **Hôm nay** có nút Sửa / Xóa cho từng phiếu.
- Nút **Chế độ đầy đủ** (ở góc trên, hoặc cuối trang chính) dành cho chủ: đầy đủ bảng biểu, báo cáo, xuất Excel, cài đặt. Bấm **Chế độ dễ dùng** để quay lại.
- Lần đầu mở app sẽ hỏi tên người nhập (ghi trên mỗi phiếu).
- Nhãn góc trên cho biết trạng thái đồng bộ lên Google Sheets (xem `google-apps-script\HUONG_DAN_CAI_DAT.md`). Mất mạng vẫn nhập bình thường.

## Cài app lên điện thoại (Thêm vào màn hình chính)
Cần đặt thư mục app lên một địa chỉ web https (ví dụ GitHub Pages, Netlify, hoặc máy chủ nội bộ) rồi mở địa chỉ đó trên điện thoại. Mở file trực tiếp (file://) vẫn chạy nhưng không cài được lên điện thoại.
- **Android (Chrome)**: mở địa chỉ app → bấm dấu ba chấm ⋮ → **Thêm vào màn hình chính** (hoặc **Cài đặt ứng dụng**) → **Thêm**.
- **iPhone (Safari)**: mở địa chỉ app bằng Safari → bấm nút **Chia sẻ** (hình vuông có mũi tên lên) → kéo xuống chọn **Thêm vào Màn hình chính** → **Thêm**.
Sau khi cài, app mở được cả khi không có mạng. Mỗi thiết bị lưu dữ liệu riêng và được đồng bộ qua Google Sheets.

Ứng dụng nay dùng thương hiệu **HOAVU** và có nút chuyển giao diện sáng/tối (☀/🌙) ở phần đầu trang.


## Giấy phép phông chữ
Ứng dụng dùng phông chữ **Be Vietnam Pro** (thư mục `fonts/`), phát hành theo giấy phép SIL Open Font License 1.1.
