Smart MiniMart AI - Đề cương đồ án mobile commerce tích hợp AI

**ĐỀ CƯƠNG ĐỒ ÁN MOBILE APP THƯƠNG MẠI ĐIỆN TỬ**

**SMART MINIMART AI**

*Ứng dụng thương mại điện tử cho siêu thị mini tích hợp AI, OCR và quản lý kho thông minh*


|**Thông tin**|**Nội dung**|
| :- | :- |
|Tên đề tài đề xuất|Smart MiniMart AI: Hệ thống mobile commerce hỗ trợ bán hàng, quản lý kho và cấu hình AI linh hoạt|
|Lĩnh vực|Thương mại điện tử, quản lý bán hàng, quản lý tồn kho, AI/OCR|
|Loại ứng dụng|Mobile app cho khách hàng, nhân viên, quản lý cửa hàng và AI Manager|
|Đối tượng áp dụng|Cửa hàng tạp hóa, siêu thị mini, cửa hàng tiện lợi quy mô nhỏ và vừa|
|Điểm nổi bật|AI tìm kiếm sản phẩm, OCR phiếu nhập hàng, cảnh báo hàng gần hết hạn, phát hiện hàng bán chậm, cấu hình model AI linh hoạt|
|Phiên bản tài liệu|Hoàn thiện ý tưởng và phạm vi triển khai đồ án|


# **Mục lục nội dung**
- 1. Tổng quan đề tài
- 2. Bối cảnh và vấn đề cần giải quyết
- 3. Mục tiêu và phạm vi hệ thống
- 4. Đối tượng sử dụng và phân quyền
- 5. Chức năng cho từng vai trò
- 6. AI trong hệ thống
- 7. Giải pháp OCR scan phiếu nhập hàng
- 8. Kiến trúc hệ thống đề xuất
- 9. Danh sách màn hình
- 10. Cơ sở dữ liệu đề xuất
- 11. Luồng nghiệp vụ và use case chính
- 12. Công nghệ đề xuất
- 13. MVP và lộ trình phát triển
- 14. Điểm mới và giá trị đồ án
- 15. Prompt giao cho AI coding


# **1. Tổng quan đề tài**
Smart MiniMart AI là ứng dụng thương mại điện tử trên mobile dành cho cửa hàng tạp hóa, siêu thị mini hoặc cửa hàng tiện lợi quy mô nhỏ và vừa. Hệ thống cho phép khách hàng xem sản phẩm, tìm kiếm, đặt hàng, thanh toán và theo dõi đơn. Đồng thời, hệ thống hỗ trợ cửa hàng quản lý sản phẩm, kho hàng, nhập hàng, đơn hàng, khuyến mãi và báo cáo kinh doanh.

Điểm khác biệt chính của đề tài là AI không được thêm vào một cách hình thức, mà được tích hợp trực tiếp vào các nghiệp vụ thực tế: quét phiếu nhập hàng bằng OCR, chuyển hình ảnh thành bảng dữ liệu, tìm kiếm sản phẩm bằng mô tả tự nhiên, phát hiện hàng bán chậm, cảnh báo hàng gần hết hạn, gợi ý nhập hàng và gợi ý khuyến mãi.

|**Hạng mục**|**Nội dung đề xuất**|
| :- | :- |
|Tên app|Smart MiniMart AI|
|Mô hình kinh doanh|Mobile commerce cho siêu thị mini/cửa hàng tạp hóa|
|Nhóm sản phẩm|Đồ uống, sữa, mì gói, bánh kẹo, đồ ăn nhanh, gia vị, đồ cá nhân, đồ gia dụng nhỏ|
|Tính năng AI cốt lõi|AI Search, AI Assistant, OCR phiếu nhập hàng, AI Analytics, AI Recommendation, AI Content|
|Role đặc biệt|AI Manager - người cấu hình API key, model, OCR engine, prompt, fallback và log AI|
|Mức triển khai|MVP có thể dùng rule-based + mock AI; bản nâng cao có thể tích hợp OpenAI-compatible API, Claude, Gemini hoặc custom endpoint|

# **2. Bối cảnh và vấn đề cần giải quyết**
Các cửa hàng nhỏ thường gặp nhiều vấn đề trong quản lý bán hàng và tồn kho: nhập hàng thủ công mất thời gian, khó theo dõi hạn sử dụng, khó biết sản phẩm nào bán chậm, khó tạo chương trình khuyến mãi đúng thời điểm và chưa có công cụ hỗ trợ khách hàng tìm sản phẩm nhanh theo nhu cầu thực tế.

|**Vấn đề**|**Tác động**|**Hướng giải quyết trong app**|
| :- | :- | :- |
|Nhập hàng thủ công từ giấy tờ|Tốn thời gian, dễ sai số lượng, sai giá nhập hoặc sai hạn sử dụng|OCR scan phiếu nhập hàng, trích xuất thành bảng, admin kiểm tra rồi xác nhận|
|Không theo dõi tốt hạn sử dụng|Hàng hết hạn gây lỗ và ảnh hưởng uy tín cửa hàng|Cảnh báo hàng gần hết hạn theo mốc 7/15/30 ngày và gợi ý giảm giá|
|Không biết hàng bán chậm|Tồn kho cao, chiếm vốn, khó xoay vòng hàng hóa|Phân tích doanh số 30 ngày, phát hiện hàng bán chậm và gợi ý xử lý|
|Khách hàng khó tìm sản phẩm theo nhu cầu|Mất thời gian, giảm tỷ lệ mua hàng|Tìm kiếm bằng mô tả tự nhiên và AI Shopping Assistant|
|AI phức tạp với người không rành công nghệ|Người dùng ngại cấu hình, khó sử dụng|AI mặc định ẩn bên trong hệ thống; chỉ AI Manager mới cấu hình model/API key|

# **3. Mục tiêu và phạm vi hệ thống**
## **3.1. Mục tiêu tổng quát**
Xây dựng một ứng dụng mobile thương mại điện tử cho siêu thị mini, tích hợp AI và OCR nhằm hỗ trợ cả khách hàng lẫn cửa hàng trong quá trình mua bán, quản lý kho và ra quyết định kinh doanh.
## **3.2. Mục tiêu cụ thể**
- Xây dựng app bán hàng có đầy đủ luồng xem sản phẩm, giỏ hàng, đặt hàng và lịch sử đơn hàng.
- Xây dựng khu vực quản trị cho cửa hàng để quản lý sản phẩm, danh mục, đơn hàng, tồn kho, nhập hàng và khuyến mãi.
- Tích hợp AI Search để khách hàng tìm sản phẩm bằng mô tả tự nhiên thay vì chỉ dùng từ khóa.
- Tích hợp OCR scan phiếu nhập hàng, chuyển ảnh giấy tờ thành bảng dữ liệu có thể chỉnh sửa.
- Phát hiện sản phẩm gần hết hạn, hàng tồn kho cao và hàng bán chậm để gợi ý xử lý.
- Tách riêng role AI Manager để cấu hình model AI, API key, OCR engine, prompt, fallback và log AI.
- Thiết kế AI Gateway giúp hệ thống có thể dùng AI mặc định, rule-based engine, mock AI hoặc custom provider mà không làm khó người dùng cuối.
## **3.3. Phạm vi MVP**

|**Nhóm**|**Phạm vi MVP nên làm**|
| :- | :- |
|Khách hàng|Đăng ký/đăng nhập, xem sản phẩm, tìm kiếm, AI Search, chi tiết sản phẩm, giỏ hàng, đặt hàng, lịch sử đơn|
|Nhân viên|Xử lý đơn, cập nhật trạng thái đơn, nhập hàng, quét phiếu nhập hàng, kiểm tra bảng OCR|
|Store Admin|Quản lý sản phẩm, danh mục, kho hàng, đơn hàng, khuyến mãi, dashboard doanh thu, hàng gần hết hạn, hàng bán chậm|
|AI Manager|Cấu hình AI provider, API key, model theo tác vụ, OCR engine, fallback, test connection, xem AI logs|
|AI/OCR|AI mặc định/rule-based/mock AI; OCR bằng PaddleOCR/EasyOCR hoặc mock OCR để demo ổn định|

# **4. Đối tượng sử dụng và phân quyền**

|**Role**|**Tên tiếng Việt**|**Mục đích**|
| :- | :- | :- |
|Customer|Khách hàng|Mua sản phẩm, tìm kiếm, đặt hàng, đánh giá, dùng AI Assistant|
|Staff|Nhân viên|Xử lý đơn hàng, nhập hàng, quét phiếu nhập, kiểm kho|
|Store Admin|Quản lý cửa hàng|Quản lý sản phẩm, tồn kho, đơn hàng, doanh thu, khuyến mãi, báo cáo|
|AI Manager|Quản trị viên hệ thống AI|Cấu hình AI provider, API key, model, OCR engine, prompt, fallback, log và giới hạn chi phí|

## **4.1. Nguyên tắc phân quyền**
- Khách hàng không thấy API key, model, prompt kỹ thuật hoặc log AI.
- Staff được dùng OCR nhập hàng nhưng không được thay đổi model AI hoặc API key.
- Store Admin quản lý nghiệp vụ cửa hàng nhưng không nhất thiết được xem API key thô.
- AI Manager chỉ quản lý hạ tầng AI/OCR, không bắt buộc có quyền sửa đơn hàng hoặc xem thông tin cá nhân khách hàng.
- Mobile app không lưu trực tiếp API key; mọi yêu cầu AI phải đi qua Backend/AI Gateway.
# **5. Chức năng cho từng vai trò**
## **5.1. Customer - Khách hàng**

|**Mã**|**Chức năng**|**Mô tả**|
| :- | :- | :- |
|CUS-01|Đăng ký/đăng nhập|Tạo tài khoản, đăng nhập, đăng xuất, cập nhật hồ sơ cá nhân|
|CUS-02|Trang chủ thông minh|Hiển thị danh mục, sản phẩm bán chạy, sản phẩm giảm giá, combo và hàng gần hạn đang sale|
|CUS-03|Xem sản phẩm|Xem danh sách, lọc theo danh mục, giá, trạng thái còn hàng|
|CUS-04|Tìm kiếm bằng từ khóa|Tìm sản phẩm theo tên, thương hiệu, danh mục|
|CUS-05|AI Search|Nhập mô tả tự nhiên như “đồ ăn sáng dưới 30k” để hệ thống gợi ý sản phẩm|
|CUS-06|AI Shopping Assistant|Chat hỏi sản phẩm phù hợp, combo, sản phẩm sale, sản phẩm thay thế|
|CUS-07|Giỏ hàng|Thêm, xóa, tăng giảm số lượng sản phẩm|
|CUS-08|Thanh toán|Đặt hàng với COD, QR giả lập hoặc ví điện tử demo|
|CUS-09|Theo dõi đơn hàng|Xem trạng thái: chờ xác nhận, đang chuẩn bị, đang giao, hoàn tất, hủy|
|CUS-10|Đánh giá sản phẩm|Rating, comment, hình ảnh; hệ thống có thể tóm tắt đánh giá bằng AI|

## **5.2. Staff - Nhân viên**

|**Mã**|**Chức năng**|**Mô tả**|
| :- | :- | :- |
|STA-01|Xem đơn cần xử lý|Xem danh sách đơn mới và chi tiết đơn|
|STA-02|Cập nhật trạng thái đơn|Xác nhận, chuẩn bị hàng, giao hàng, hoàn tất hoặc hủy theo quyền|
|STA-03|Nhập hàng|Tạo phiếu nhập hàng thủ công hoặc bằng OCR|
|STA-04|Quét phiếu nhập hàng|Chụp/upload ảnh phiếu nhập để hệ thống chuyển thành bảng dữ liệu|
|STA-05|Kiểm tra dữ liệu OCR|Chỉnh sửa tên sản phẩm, số lượng, giá nhập, hạn sử dụng trước khi xác nhận|
|STA-06|Kiểm kho|Cập nhật tồn kho thực tế, kiểm tra hàng sắp hết hoặc gần hết hạn|

## **5.3. Store Admin - Quản lý cửa hàng**

|**Mã**|**Chức năng**|**Mô tả**|
| :- | :- | :- |
|ADM-01|Dashboard|Xem doanh thu, đơn hàng, sản phẩm bán chạy, sản phẩm bán chậm, tồn kho|
|ADM-02|Quản lý sản phẩm|Thêm/sửa/xóa sản phẩm, ảnh, giá, mô tả, danh mục, trạng thái bán|
|ADM-03|Quản lý danh mục|Tạo danh mục như đồ uống, sữa, mì gói, bánh kẹo, đồ cá nhân|
|ADM-04|Quản lý kho|Theo dõi tồn kho, nhập/xuất kho, lịch sử thay đổi tồn kho|
|ADM-05|Hàng gần hết hạn|Xem cảnh báo hàng còn 7/15/30 ngày và gợi ý khuyến mãi|
|ADM-06|Hàng bán chậm|Xem sản phẩm tồn kho cao nhưng bán thấp trong 30 ngày gần nhất|
|ADM-07|Gợi ý nhập hàng|Dựa trên tồn kho và tốc độ bán để đề xuất số lượng cần nhập|
|ADM-08|Quản lý khuyến mãi|Tạo mã giảm giá, flash sale, combo, khuyến mãi hàng gần hạn|
|ADM-09|Báo cáo doanh thu|Xem báo cáo theo ngày, tuần, tháng; xuất Excel/PDF nếu cần|

## **5.4. AI Manager - Quản trị viên hệ thống AI**

|**Mã**|**Chức năng**|**Mô tả**|
| :- | :- | :- |
|AI-01|AI Overview|Xem trạng thái các tác vụ AI, provider đang bật, lỗi gần đây, số request|
|AI-02|Provider Settings|Thêm/sửa provider: System Default, OpenAI-compatible, Anthropic, Gemini, Custom API|
|AI-03|API Key Management|Nhập API key, lưu mã hóa ở backend, không hiển thị key đầy đủ sau khi lưu|
|AI-04|Task Model Mapping|Chọn model chính và model dự phòng cho từng tác vụ|
|AI-05|OCR Engine Settings|Chọn Mock OCR, PaddleOCR, EasyOCR, Tesseract, Vision AI hoặc Hybrid OCR|
|AI-06|Prompt Templates|Quản lý prompt cho AI Search, AI Assistant, OCR Parser, Analytics|
|AI-07|Test Playground|Test prompt/model/OCR trước khi áp dụng cho cửa hàng|
|AI-08|Fallback Settings|Nếu model lỗi thì dùng rule-based, mock AI hoặc provider dự phòng|
|AI-09|AI Logs|Xem lịch sử request, response tóm tắt, lỗi, thời gian xử lý, confidence|
|AI-10|Usage Limit|Giới hạn số request/ngày, chi phí/tháng, token hoặc lượt OCR|

# **6. AI trong hệ thống**
## **6.1. Nguyên tắc thiết kế AI**
AI phải được thiết kế theo hướng dễ dùng. Người dùng bình thường không cần biết API key, model name hay provider. Họ chỉ thấy tính năng thông minh trong app. Việc cấu hình kỹ thuật được tách riêng cho AI Manager.

|**Chế độ AI**|**Đối tượng**|**Ý nghĩa**|
| :- | :- | :- |
|System Default AI|Mặc định cho toàn hệ thống|Hệ thống tự dùng model mặc định, người dùng không cần cấu hình|
|Rule-based AI|MVP/demo/offline một phần|Dùng luật nghiệp vụ để tìm kiếm, cảnh báo hàng gần hạn, hàng bán chậm, gợi ý nhập hàng|
|Mock AI|Demo khi chưa có API key|Trả dữ liệu mẫu có kiểm soát để thuyết trình ổn định|
|Custom AI Provider|AI Manager nâng cao|Cấu hình OpenAI-compatible API, Anthropic, Gemini hoặc custom endpoint|
|Hybrid AI|Bản khuyên dùng|Kết hợp rule-based để đảm bảo đúng nghiệp vụ và LLM để giải thích tự nhiên|

## **6.2. Các nhóm tính năng AI**

|**Nhóm AI**|**Tác vụ**|**Ví dụ**|
| :- | :- | :- |
|AI Search|Tìm sản phẩm bằng mô tả tự nhiên|“Tôi cần nước uống ít đường dưới 20k” → lọc đồ uống, tag ít đường, giá dưới 20k|
|AI Assistant|Chat tư vấn mua hàng|“100k mua gì ăn tối?” → gợi ý combo phù hợp tồn kho|
|AI OCR/Vision|Đọc phiếu nhập hàng|Ảnh hóa đơn → bảng tên sản phẩm, số lượng, giá nhập, hạn sử dụng|
|AI Analytics|Phân tích hàng bán chậm/gần hết hạn|Tồn kho cao + bán ít → đề xuất giảm giá/combo|
|AI Recommendation|Gợi ý sản phẩm/combo|Mua mì gói → gợi ý xúc xích, nước uống, khăn giấy|
|AI Content|Sinh nội dung mô tả/khuyến mãi|Tự viết mô tả sản phẩm hoặc thông báo push notification|

## **6.3. Cấu hình model theo tác vụ**

|**Tác vụ**|**Model chính**|**Model dự phòng**|**Chế độ khuyên dùng**|
| :- | :- | :- | :- |
|Chat tư vấn khách hàng|System Default LLM / GPT-compatible|Mock AI|Online AI + fallback|
|Tìm kiếm bằng mô tả|Rule-based + LLM Parser|Rule-based Search|Hybrid|
|OCR phiếu nhập hàng|PaddleOCR hoặc EasyOCR|Mock OCR|Local OCR|
|Chuyển OCR text thành JSON|LLM Parser|Rule Parser|Hybrid|
|Phân tích hàng bán chậm|Rule-based + LLM Explanation|Rule-based|Hybrid|
|Gợi ý khuyến mãi|LLM|Template/Mock AI|Online AI + fallback|
|Tóm tắt đánh giá|LLM|Template summary|Online AI|

# **7. Giải pháp OCR scan phiếu nhập hàng**
OCR không nên được thiết kế theo hướng tự động tin tưởng 100%. Cách đúng là: hệ thống đọc trước, chuyển thành bảng, sau đó nhân viên hoặc admin kiểm tra và chỉnh sửa trước khi xác nhận nhập kho.

Ảnh phiếu nhập hàng\
`        `↓\
OCR Engine đọc chữ\
`        `↓\
Parser chuyển text thành JSON/bảng\
`        `↓\
Nhân viên kiểm tra và chỉnh sửa\
`        `↓\
Xác nhận nhập kho\
`        `↓\
Cập nhật tồn kho + lưu lịch sử nhập hàng
## **7.1. Lựa chọn công cụ OCR**

|**Công cụ**|**Mức phù hợp**|**Ưu điểm**|**Nhược điểm**|
| :- | :- | :- | :- |
|PaddleOCR|Rất phù hợp|Mạnh cho OCR tài liệu, có hướng xử lý layout/bảng, phù hợp backend Python|Cài đặt nặng hơn, cần service riêng|
|EasyOCR|Phù hợp MVP|Dễ dùng, code nhanh, hỗ trợ nhiều ngôn ngữ|Cần tự parse bảng nhiều hơn|
|Tesseract OCR|Phù hợp cơ bản|Nhẹ, phổ biến, nhiều tài liệu|Kém hơn với ảnh nghiêng/mờ/bố cục phức tạp|
|Google ML Kit Text Recognition|Phù hợp mobile|Có thể chạy trên mobile, dễ tích hợp Flutter/Android|Vẫn cần parser để chuyển text thành bảng|
|Vision LLM|Rất tốt nếu có API|Có thể đọc ảnh và trả JSON trực tiếp|Tốn chi phí, phụ thuộc mạng/API key|

## **7.2. Chiến lược đảm bảo demo ổn định**
- Chuẩn bị 3-5 ảnh phiếu nhập hàng mẫu rõ nét, chữ in to, bố cục đơn giản.
- Cho phép chọn “Dùng ảnh mẫu demo” ngay trong màn hình OCR.
- Dùng PaddleOCR hoặc EasyOCR làm OCR thật ở backend.
- Nếu OCR confidence thấp, hiển thị cảnh báo và cho phép sửa tay.
- Luôn có Mock OCR để demo trong trường hợp không có API key, mạng yếu hoặc OCR lỗi.
- Không tự động nhập kho ngay sau OCR; bắt buộc nhân viên kiểm tra rồi bấm xác nhận.
## **7.3. Kết quả OCR mong muốn**

|**Trường dữ liệu**|**Mô tả**|
| :- | :- |
|supplierName|Tên nhà cung cấp|
|importDate|Ngày nhập hàng|
|productName|Tên sản phẩm|
|quantity|Số lượng nhập|
|unitPrice|Giá nhập một đơn vị|
|expiryDate|Hạn sử dụng|
|confidence|Độ tin cậy nhận diện|

{\
`  `"supplierName": "Nhà phân phối ABC",\
`  `"importDate": "2026-05-19",\
`  `"items": [\
`    `{\
`      `"productName": "Sữa TH True Milk",\
`      `"quantity": 50,\
`      `"unitPrice": 8000,\
`      `"expiryDate": "2026-08-20",\
`      `"confidence": 0.92\
`    `},\
`    `{\
`      `"productName": "Mì Hảo Hảo",\
`      `"quantity": 100,\
`      `"unitPrice": 3200,\
`      `"expiryDate": "2026-12-10",\
`      `"confidence": 0.88\
`    `}\
`  `]\
}
# **8. Kiến trúc hệ thống đề xuất**
## **8.1. Kiến trúc tổng thể**
Flutter Mobile App\
`   `├── Customer UI\
`   `├── Staff UI\
`   `├── Store Admin UI\
`   `└── AI Manager UI\
`        `↓\
Backend API / Business Service\
`        `↓\
Database + Storage\
`        `↓\
AI Gateway\
`   `├── Rule-based Engine\
`   `├── Mock AI\
`   `├── Model Router\
`   `├── OpenAI-compatible Provider\
`   `├── Anthropic/Gemini/Custom Provider\
`   `└── OCR Service\
`        `├── PaddleOCR\
`        `├── EasyOCR\
`        `└── Mock OCR
## **8.2. Lý do không lưu API key trong mobile app**
- Mobile app dễ bị decompile hoặc lộ thông tin cấu hình.
- API key cần được lưu mã hóa ở backend hoặc trong biến môi trường/server secret.
- Backend có thể ghi log, giới hạn request, kiểm soát chi phí và fallback khi lỗi.
- AI Manager có thể thay model mà không cần phát hành lại ứng dụng mobile.
# **9. Danh sách màn hình**
## **9.1. Màn hình Customer**

|**STT**|**Màn hình**|**Mô tả**|
| :- | :- | :- |
|1|Login/Register|Đăng nhập, đăng ký tài khoản|
|2|Home|Banner, danh mục, sản phẩm gợi ý, sản phẩm sale|
|3|Category List|Danh sách danh mục sản phẩm|
|4|Product List|Danh sách sản phẩm theo danh mục/bộ lọc|
|5|Product Detail|Thông tin chi tiết, giá, tồn kho, đánh giá|
|6|AI Search|Tìm kiếm bằng mô tả tự nhiên|
|7|AI Chat Assistant|Chat hỏi sản phẩm/combo phù hợp|
|8|Cart|Giỏ hàng|
|9|Checkout|Đặt hàng, địa chỉ, thanh toán|
|10|Order History|Lịch sử đơn hàng|
|11|Review Product|Đánh giá sản phẩm|
|12|Profile|Thông tin cá nhân, địa chỉ|

## **9.2. Màn hình Staff/Store Admin**

|**STT**|**Màn hình**|**Mô tả**|
| :- | :- | :- |
|1|Admin Dashboard|Tổng quan doanh thu, đơn hàng, tồn kho|
|2|Product Management|Quản lý sản phẩm|
|3|Add/Edit Product|Thêm/sửa sản phẩm|
|4|Category Management|Quản lý danh mục|
|5|Inventory Management|Quản lý tồn kho|
|6|Import Receipt Scanner|Quét/upload phiếu nhập hàng|
|7|Extracted Receipt Table|Bảng dữ liệu OCR có thể chỉnh sửa|
|8|Expiring Products Alert|Cảnh báo hàng gần hết hạn|
|9|Slow-moving Products Alert|Cảnh báo hàng bán chậm|
|10|Restock Suggestion|Gợi ý nhập hàng|
|11|Promotion Management|Quản lý khuyến mãi/combo|
|12|Order Management|Quản lý đơn hàng|
|13|Reports|Báo cáo doanh thu, tồn kho, sản phẩm|

## **9.3. Màn hình AI Manager**

|**STT**|**Màn hình**|**Mô tả**|
| :- | :- | :- |
|1|AI Control Center|Tổng quan trạng thái AI/OCR|
|2|Provider Settings|Cấu hình provider, base URL, API key|
|3|Task Model Mapping|Chọn model theo từng tác vụ|
|4|OCR Engine Settings|Chọn PaddleOCR/EasyOCR/Tesseract/Vision/Mock/Hybrid|
|5|Prompt Templates|Quản lý prompt hệ thống|
|6|Fallback Settings|Cấu hình model/engine dự phòng|
|7|Test Playground|Test model, OCR, parser|
|8|AI Logs|Xem lịch sử xử lý AI/OCR|
|9|Usage & Cost Limit|Giới hạn request/token/chi phí|

# **10. Cơ sở dữ liệu đề xuất**

|**Bảng/Collection**|**Mục đích**|**Trường chính**|
| :- | :- | :- |
|users|Lưu tài khoản người dùng|id, name, email, phone, role, status, createdAt|
|roles|Danh sách role|id, name, description|
|permissions|Quyền chi tiết|id, code, description|
|user\_roles|Gán role cho user|userId, roleId|
|categories|Danh mục sản phẩm|id, name, imageUrl, status|
|products|Sản phẩm|id, name, categoryId, price, importPrice, stock, imageUrl, expiryDate, tags|
|orders|Đơn hàng|id, userId, totalAmount, status, paymentMethod, createdAt|
|order\_items|Chi tiết đơn hàng|id, orderId, productId, quantity, price|
|inventory\_transactions|Lịch sử nhập/xuất kho|id, productId, type, quantity, reason, createdBy, createdAt|
|import\_receipts|Phiếu nhập hàng|id, supplierName, imageUrl, extractedData, totalAmount, status|
|promotions|Khuyến mãi|id, name, type, discountValue, startDate, endDate, conditions|
|reviews|Đánh giá sản phẩm|id, userId, productId, rating, comment, imageUrls|
|ai\_providers|Provider AI|id, name, type, baseUrl, apiKeyEncrypted, status|
|ai\_task\_configs|Cấu hình model theo tác vụ|taskType, primaryProviderId, primaryModel, fallbackModel, mode|
|ocr\_settings|Cấu hình OCR|mode, localEngine, fallbackEngine, confidenceThreshold, requireReview|
|ai\_logs|Nhật ký AI/OCR|taskType, provider, model, status, latencyMs, confidence, createdAt|

# **11. Luồng nghiệp vụ và use case chính**
## **11.1. Luồng khách hàng tìm sản phẩm bằng AI**
1. Khách hàng mở màn hình AI Search.
1. Nhập mô tả: “Tôi cần đồ ăn sáng nhanh dưới 30k”.
1. Hệ thống gửi yêu cầu về backend.
1. AI Gateway dùng rule-based/LLM để trích xuất nhu cầu: bữa sáng, nhanh, ngân sách dưới 30k.
1. Backend lọc sản phẩm theo danh mục, giá, tồn kho và tag.
1. AI tạo lời giải thích ngắn gọn và gợi ý combo.
1. Khách hàng thêm sản phẩm/combo vào giỏ hàng và đặt hàng.
## **11.2. Luồng Staff quét phiếu nhập hàng**
1. Staff mở màn hình Import Receipt Scanner.
1. Chụp ảnh hoặc upload phiếu nhập hàng.
1. Backend lưu ảnh và gửi sang OCR Service.
1. OCR Engine đọc text từ ảnh.
1. Parser chuyển raw text thành JSON/bảng sản phẩm.
1. Hệ thống hiển thị bảng kết quả kèm độ tin cậy.
1. Staff kiểm tra, chỉnh sửa dữ liệu nếu cần.
1. Staff bấm xác nhận nhập kho.
1. Hệ thống cập nhật tồn kho, lưu phiếu nhập, lưu log AI/OCR.
1. Nếu phát hiện hàng gần hết hạn hoặc tồn kho bất thường, hệ thống tạo cảnh báo.
## **11.3. Luồng AI Manager cấu hình model**
1. AI Manager đăng nhập và mở AI Control Center.
1. Thêm provider mới hoặc chọn System Default AI.
1. Nhập base URL, API key, model name nếu dùng custom provider.
1. Bấm Test Connection để kiểm tra kết nối.
1. Vào Task Model Mapping để chọn model cho từng tác vụ.
1. Chọn OCR Engine: PaddleOCR, EasyOCR, Vision AI, Hybrid hoặc Mock OCR.
1. Cấu hình fallback nếu model/OCR lỗi.
1. Lưu cấu hình. Store Admin và Staff dùng các tính năng AI mà không cần biết chi tiết kỹ thuật.
# **12. Công nghệ đề xuất**

|**Thành phần**|**Phương án khuyên dùng**|**Ghi chú**|
| :- | :- | :- |
|Mobile App|Flutter|Một codebase cho Android/iOS, UI nhanh và đẹp|
|Backend|Node.js Express hoặc NestJS|Dễ xây REST API, phân quyền, AI Gateway|
|Database|PostgreSQL hoặc Firebase Firestore|PostgreSQL chuyên nghiệp hơn; Firestore làm nhanh hơn|
|Storage ảnh|Firebase Storage hoặc Cloudinary|Lưu ảnh sản phẩm và ảnh phiếu nhập hàng|
|Authentication|JWT hoặc Firebase Auth|Tùy backend chọn|
|Notification|Firebase Cloud Messaging|Thông báo đơn hàng, hàng gần hết hạn, giảm giá|
|OCR Service|Python FastAPI + PaddleOCR/EasyOCR|Service riêng để đọc phiếu nhập hàng|
|AI Gateway|Backend service|Router tới System Default AI, custom provider, rule-based, mock AI|
|Payment Demo|COD + QR giả lập|Đủ cho đồ án; có thể thêm VNPay sandbox nếu muốn nâng cao|

# **13. MVP và lộ trình phát triển**

|**Giai đoạn**|**Nội dung**|**Mục tiêu**|
| :- | :- | :- |
|MVP 1|Customer mua hàng cơ bản, admin quản lý sản phẩm/đơn hàng|Có app thương mại điện tử chạy được|
|MVP 2|Kho hàng, nhập hàng, cảnh báo hàng gần hết hạn, hàng bán chậm|Có nghiệp vụ cửa hàng rõ ràng|
|MVP 3|AI Search, AI Assistant đơn giản, rule-based analytics|Có AI hữu ích cho khách hàng và admin|
|MVP 4|OCR scan phiếu nhập hàng + bảng chỉnh sửa + xác nhận nhập kho|Tạo điểm nhấn khi demo|
|MVP 5|AI Manager, AI Control Center, model mapping, OCR settings, AI logs|Làm hệ thống xịn và có cấu hình linh hoạt|
|Nâng cao|Vision search, dự báo nhu cầu, tóm tắt review, xuất báo cáo PDF/Excel, multi-store|Mở rộng sau khi MVP ổn định|

# **14. Điểm mới và giá trị đồ án**
- Không chỉ là app bán hàng mà là hệ thống mobile commerce có quản lý kho và AI hỗ trợ vận hành.
- AI được tích hợp vào nghiệp vụ thực tế: tìm kiếm, tư vấn, OCR, phân tích tồn kho, gợi ý khuyến mãi.
- Có role AI Manager chuyên cấu hình model/API key/OCR, giúp tách biệt người dùng phổ thông và cấu hình kỹ thuật.
- Hệ thống có fallback bằng rule-based và mock AI, đảm bảo demo ổn định kể cả khi không có API key thật.
- OCR phiếu nhập hàng giúp giảm nhập liệu thủ công và tạo điểm nhấn rất rõ trong buổi thuyết trình.
- Thiết kế kiến trúc AI Gateway giúp hệ thống có khả năng mở rộng sang nhiều provider khác nhau.

Tài liệu đề xuất ý tưởng và phạm vi triển khai đồ án
