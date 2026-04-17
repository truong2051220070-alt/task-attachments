* **Frontend:** ReactJS
* **Backend:** NodeJS
* Tinh thần: **lab thực tế, có failure, có debug, có tiêu chí nghiệm thu**, không phải demo cho có.

---

# Định hướng chung cho cả 2 lab

Cả hai lab đều dùng **cùng một bài toán nghiệp vụ** để dễ so sánh kiến trúc:

## Bài toán

Xây dựng một **mini Incident Board / Task Board** có:

* tạo task
* danh sách task
* upload file đính kèm cho task
* cập nhật trạng thái task
* realtime cập nhật danh sách task trên nhiều tab trình duyệt

## Tại sao chọn bài toán này

Vì nó chạm được đủ các capability:

* **DB**: lưu task
* **Storage**: lưu file đính kèm
* **Realtime**: đẩy cập nhật
* **Backend orchestration**: backend đứng giữa xử lý logic
* **Frontend**: thao tác và quan sát kết quả

Nó đủ thực tế, nhưng vẫn vừa sức để triển khai trong 1 buổi lab.

---

# LAB 1 — Supabase All-in-One

## 1. Mục tiêu học tập

Sau lab này, người học phải thấy rõ:

* một hệ thống có thể chạy rất nhanh với **all-in-one platform**
* backend không chỉ viết API mà còn phải **kết nối external services**
* file phải đi qua **storage**, không nhét vào DB
* realtime là **infrastructure capability**, không phải “refresh trang”
* cái giá của sự tiện lợi là **platform coupling**

---

## 2. Kiến trúc lab

```text
ReactJS Frontend
        ↓ HTTP
NodeJS Backend API
        ↓
Supabase PostgreSQL
Supabase Storage
Supabase Realtime
```

## 3. Kết quả cuối cùng phải đạt

Người học mở 2 tab trình duyệt:

* tab A tạo task mới
* tab B thấy task xuất hiện gần như ngay lập tức
* upload file thành công
* URL file được lưu trong DB
* click vào URL mở được file
* đổi trạng thái task ở tab A thì tab B cập nhật gần realtime

---

## 4. Phạm vi chức năng

### Chức năng bắt buộc

* tạo task
* xem danh sách task
* upload 1 file đính kèm
* cập nhật trạng thái task
* realtime refresh danh sách task

### Chức năng không bắt buộc

* auth
* phân quyền
* xóa file cũ khi update
* pagination
* search

Không nên nhồi quá nhiều, vì mục tiêu buổi này là **system integration**, không phải build full app.

---

## 5. Cấu trúc project gợi ý

### Backend NodeJS

Dùng Express.

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      supabase.js
    routes/
      task.routes.js
      upload.routes.js
    controllers/
      task.controller.js
      upload.controller.js
    services/
      task.service.js
      storage.service.js
    utils/
      response.js
      errors.js
  .env
  package.json
```

### Frontend ReactJS

Có thể dùng Vite.

```text
frontend/
  src/
    api/
      client.js
      taskApi.js
    components/
      TaskForm.jsx
      TaskList.jsx
      UploadBox.jsx
    pages/
      HomePage.jsx
    hooks/
      useRealtimeTasks.js
    App.jsx
    main.jsx
  .env
  package.json
```

---

## 6. Thiết kế dữ liệu

## Bảng `tasks`

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  status text not null default 'open',
  attachment_url text null,
  attachment_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Giá trị status

* `open`
* `in_progress`
* `done`

## Vì sao schema này hợp lý

* đủ để CRUD cơ bản
* có file URL để minh họa storage tách khỏi DB
* có status để test update + realtime
* có timestamp để quan sát thứ tự thay đổi

---

## 7. Chuẩn bị Supabase

## Tạo project

Người học phải tự làm:

* tạo 1 project Supabase
* copy:

  * `SUPABASE_URL`
  * `SUPABASE_ANON_KEY`
  * `SUPABASE_SERVICE_ROLE_KEY`

## Tạo bucket storage

Tên bucket:

* `task-attachments`

Chế độ:

* private hoặc public đều được, nhưng để lab dễ hơn có thể để public trước
* nếu muốn thực tế hơn: để private rồi backend generate signed URL

## Bật Realtime cho bảng tasks

Mục tiêu:

* frontend subscribe thay đổi INSERT / UPDATE trên bảng `tasks`

---

## 8. ENV backend

```env
PORT=4000
NODE_ENV=development

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...

DB_PROVIDER=supabase
FILE_PROVIDER=supabase
REALTIME_PROVIDER=supabase
STORAGE_BUCKET=task-attachments
```

## Giải thích thực tế

* backend nên dùng `SERVICE_ROLE_KEY` cho thao tác server-server
* frontend không nên dùng service role
* tách provider bằng ENV để gieo tư duy config-driven system

---

## 9. API backend phải có

## 9.1 Tạo task

`POST /api/tasks`

Request:

```json
{
  "title": "Database connection failure",
  "description": "Need urgent check"
}
```

Response:

```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "status": "open",
  "attachment_url": null
}
```

## 9.2 Lấy danh sách task

`GET /api/tasks`

Response:

```json
[
  {
    "id": "...",
    "title": "...",
    "status": "open",
    "attachment_url": null
  }
]
```

## 9.3 Cập nhật trạng thái

`PATCH /api/tasks/:id/status`

Request:

```json
{
  "status": "done"
}
```

## 9.4 Upload file cho task

`POST /api/tasks/:id/attachment`

Request:

* multipart/form-data
* field: `file`

Luồng đúng:

1. backend nhận file
2. upload lên Supabase Storage
3. lấy public URL hoặc signed URL
4. update `tasks.attachment_url`
5. trả task mới

---

## 10. Luồng triển khai backend

## 10.1 Tạo client Supabase

Dùng SDK chính thức.

## 10.2 Task service

Tách service rõ ràng:

* `createTask`
* `listTasks`
* `updateTaskStatus`
* `attachFileToTask`

## 10.3 Upload flow

Phải nhấn mạnh với người học:

**Không làm kiểu:**

* convert file sang base64 rồi nhét DB

**Phải làm kiểu:**

* binary file lên storage
* DB chỉ lưu metadata và URL

Đây là điểm rất quan trọng về production mindset.  

---

## 11. Frontend ReactJS phải có gì

## 11.1 Màn hình chính

Một trang duy nhất là đủ, gồm:

* form tạo task
* danh sách task
* nút đổi trạng thái
* upload file
* link mở file

## 11.2 State cần có

* list task
* loading
* error message
* upload progress giả lập hoặc đơn giản là uploading state

## 11.3 Realtime

Frontend subscribe trên bảng `tasks`.

Khi có:

* INSERT
* UPDATE

thì fetch lại danh sách hoặc update state tại chỗ.

### Khuyến nghị cho lab

Để dễ dạy:

* cứ nhận event xong gọi `GET /api/tasks` lại

Dù chưa tối ưu, nhưng ổn cho lab và dễ debug.

---

## 12. Quy trình lab đề xuất trên lớp

## Giai đoạn 1 — Dựng backend

Người học làm được:

* API create task
* API list task

## Giai đoạn 2 — Dựng frontend cơ bản

Người học làm được:

* form tạo task
* list task

## Giai đoạn 3 — Gắn storage

Người học làm được:

* upload file
* lưu URL vào task

## Giai đoạn 4 — Gắn realtime

Người học mở 2 tab:

* tab A tạo task
* tab B thấy task mới

## Giai đoạn 5 — Failure simulation

Người học cố tình làm sai config hoặc service để quan sát lỗi

---

## 13. Failure scenarios bắt buộc cho Lab 1

Đây là phần rất quan trọng. Không có nó thì lab chỉ là CRUD.

## Scenario 1 — Sai `SUPABASE_URL`

### Cách làm

Sửa `SUPABASE_URL` sai rồi restart backend.

### Kết quả mong đợi

* backend fail khi gọi DB hoặc storage
* API trả 500 có message rõ ràng
* log hiện lỗi connection/config

### Bài học

Code đúng vẫn fail nếu config sai.
Điểm này bám rất sát phần “production failure thường là config failure”.  

---

## Scenario 2 — Sai bucket name

### Cách làm

Đổi `STORAGE_BUCKET=wrong-bucket`

### Kết quả mong đợi

* tạo task vẫn chạy
* upload file fail
* app không được crash toàn bộ

### Bài học

Một dependency fail không nên kéo sập toàn hệ thống.

---

## Scenario 3 — Tắt Realtime / unsubscribe

### Cách làm

Tắt subscribe ở frontend.

### Kết quả mong đợi

* create/update task vẫn thành công
* chỉ mất cập nhật realtime
* refresh trang vẫn thấy dữ liệu đúng

### Bài học

Realtime là lớp delivery, không phải source of truth.
DB mới là persistence. 

---

## Scenario 4 — Upload xong nhưng DB update fail

### Cách làm

Cố tình viết code:

* upload file thành công
* update task lỗi

### Kết quả mong đợi

* storage có file mồ côi
* DB không có URL

### Bài học

External dependency tạo ra vấn đề consistency giữa services.
Đây là lỗi rất thực tế.

### Cách xử lý tốt hơn

* nếu DB update fail thì xóa file vừa upload
* hoặc đánh dấu orphan cleanup job về sau

---

## 14. Tiêu chí nghiệm thu Lab 1

Nhóm hoàn thành khi:

* tạo được task
* xem được danh sách task
* upload file thành công
* DB chỉ lưu URL, không lưu binary
* 2 tab browser thấy update gần realtime
* khi storage fail, create task không nhất thiết fail theo
* có log rõ lỗi config hoặc service
* có file `.env.example`

---

## 15. Báo cáo sau lab mà người học phải trả lời được

1. Vì sao file không nên lưu trong DB? 
2. Vì sao realtime không nên coi là nguồn dữ liệu chính? 
3. Nếu Supabase down, hệ thống ảnh hưởng những gì?
4. Lab này triển khai nhanh ở điểm nào?
5. Cái giá phải trả của all-in-one là gì? 

---

# LAB 2 — Distributed Services

Lab này phải cho người học cảm được rằng:

> production thật thường không “một provider lo hết”.

---

## 1. Mục tiêu học tập

Sau lab này, người học phải thấy rõ:

* một hệ thống production có thể dùng **nhiều provider khác nhau**
* backend đóng vai trò **integration point**
* cấu hình phức tạp hơn rất nhiều
* debug khó hơn rất nhiều
* nhưng đổi lại có **service boundary rõ hơn** và dễ tối ưu từng capability

---

## 2. Kiến trúc lab

```text
ReactJS Frontend
        ↓ HTTP
NodeJS Backend
        ↓            ↓             ↓
     Neon DB     Cloudinary     Ably
```

## 3. Chức năng vẫn giữ giống Lab 1

Vẫn là mini Incident Board / Task Board:

* create task
* list task
* upload attachment
* update status
* realtime update đa tab

Giữ cùng bài toán để người học tập trung vào **khác biệt kiến trúc**, không bị nhiễu bởi nghiệp vụ.

---

## 4. Vai trò từng service

## Neon

* lưu dữ liệu task
* source of truth

## Cloudinary

* lưu file đính kèm
* xử lý media/file URL

## Ably

* publish event `task.created`, `task.updated`
* frontend subscribe channel để nhận update realtime

---

## 5. Thiết kế dữ liệu

Ở Neon, dùng PostgreSQL.

Bảng `tasks` tương tự Lab 1:

```sql
create table tasks (
  id uuid primary key,
  title varchar(255) not null,
  description text,
  status varchar(50) not null default 'open',
  attachment_url text,
  attachment_name varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Có thể dùng ORM nào

* Prisma
* Sequelize
* Knex

### Khuyến nghị

Nếu dạy DevOps mindset, chọn **Prisma** hoặc **Knex** là ổn.
Nếu muốn gần SQL hơn, dùng `pg` + SQL tay cũng rất tốt.

---

## 6. ENV backend cho Lab 2

```env
PORT=4000
NODE_ENV=development

DB_PROVIDER=neon
FILE_PROVIDER=cloudinary
REALTIME_PROVIDER=ably

DATABASE_URL=postgresql://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

ABLY_API_KEY=...
ABLY_CHANNEL=incident-board
```

## Điều người học phải cảm nhận

Cùng một app, nhưng số lượng config tăng lên rất rõ.
Điều này bám sát phần “distributed = nhiều config, nhiều billing, nhiều failure points”. 

---

## 7. API backend phải có

Giữ gần giống Lab 1.

## 7.1 Tạo task

`POST /api/tasks`

Luồng:

1. insert vào Neon
2. publish event `task.created` lên Ably
3. trả response

## 7.2 Lấy danh sách task

`GET /api/tasks`

Đọc trực tiếp từ Neon.

## 7.3 Cập nhật trạng thái

`PATCH /api/tasks/:id/status`

Luồng:

1. update Neon
2. publish `task.updated`
3. trả task mới

## 7.4 Upload file

`POST /api/tasks/:id/attachment`

Luồng:

1. upload file lên Cloudinary
2. lấy URL
3. update task trong Neon
4. publish `task.updated`

---

## 8. Điểm rất quan trọng khi dạy Lab 2

### DB là source of truth

Không dùng Ably như nơi lưu dữ liệu.

### Ably chỉ để delivery event

Khi nhận event, frontend nên:

* hoặc fetch lại task list
* hoặc update state dựa trên payload

### Cloudinary là binary storage

DB chỉ giữ URL.

Đây là tách bạch responsibility rất đẹp về mặt kiến trúc.
Nó bám sát logic “DB = persistence, realtime = delivery”. 

---

## 9. Frontend ReactJS cho Lab 2

## 9.1 UI

Giữ gần như y hệt Lab 1 để dễ so sánh.

## 9.2 Realtime bằng Ably

Frontend subscribe channel `incident-board`.

Khi có event:

* `task.created`
* `task.updated`

thì reload list hoặc patch state.

## 9.3 Điều cần giải thích trên lớp

Lab 1:

* realtime gắn với DB change

Lab 2:

* realtime là service độc lập

Đây chính là khác biệt cốt lõi giữa:

* **DB-coupled realtime**
* **independent messaging system**  

---

## 10. Failure scenarios bắt buộc cho Lab 2

Lab 2 mà không có failure thì gần như mất hết giá trị.

## Scenario 1 — Neon DB lỗi kết nối

### Cách làm

Sửa `DATABASE_URL` sai.

### Kết quả mong đợi

* create task fail
* list task fail
* upload file có thể upload được nhưng business flow không hoàn tất

### Bài học

DB là critical dependency và dễ là single point of failure.  

---

## Scenario 2 — Cloudinary lỗi nhưng DB vẫn sống

### Cách làm

Sửa `CLOUDINARY_API_SECRET` sai.

### Kết quả mong đợi

* create task không file vẫn chạy
* upload attachment fail
* list task vẫn chạy
* realtime task status vẫn chạy

### Bài học

Distributed system cho phép degrade theo capability.

---

## Scenario 3 — Ably lỗi

### Cách làm

Sửa `ABLY_API_KEY` sai.

### Kết quả mong đợi

* create/update task vẫn thành công ở DB
* chỉ mất realtime push
* refresh vẫn thấy dữ liệu đúng

### Bài học

Realtime fail không đồng nghĩa dữ liệu fail.

---

## Scenario 4 — Publish event fail sau khi DB commit

### Cách làm

Cố tình để:

* DB update thành công
* Ably publish fail

### Kết quả mong đợi

* dữ liệu đã đổi
* client khác chưa thấy ngay
* refresh thì thấy

### Bài học

Distributed system thường gặp **partial success**.

### Câu hỏi rất thực tế

Có cần rollback DB không?

Câu trả lời thường là:

* **không rollback**
* chấp nhận eventual consistency ở lớp realtime
* log lỗi và retry publish nếu cần

Đây là đúng tinh thần production hơn toy app.

---

## Scenario 5 — File upload thành công nhưng DB update lỗi

Tương tự Lab 1, nhưng thực tế hơn vì Cloudinary là service khác hẳn DB.

### Hệ quả

* file mồ côi
* DB chưa trỏ tới file

### Bài học

Cross-service transaction không hề đơn giản.
Không phải cứ “gọi API liên tiếp” là xong.

---

## 11. Nội dung debug bắt buộc phải yêu cầu người học làm

Không chỉ chạy app, mà phải debug có phương pháp.

## Checklist debug

Khi chức năng hỏng, yêu cầu kiểm tra theo thứ tự:

1. backend có chạy không
2. ENV có đúng không
3. network request từ frontend có tới backend không
4. backend có tới được DB không
5. backend có upload được storage không
6. backend có publish được realtime không

Điều này bám đúng debug flow system-level của slide. 

---

## 12. Tiêu chí nghiệm thu Lab 2

Nhóm hoàn thành khi:

* tạo task thành công
* list task thành công
* upload attachment qua Cloudinary thành công
* update status thành công
* 2 tab browser thấy update qua Ably
* khi Ably fail, app vẫn CRUD được
* khi Cloudinary fail, app vẫn CRUD task được
* có log tách biệt lỗi DB / storage / realtime
* có `.env.example`
* có sơ đồ kiến trúc hệ thống nhóm tự vẽ

---

## 13. Câu hỏi phản biện sau lab

1. Lab 2 phức tạp hơn Lab 1 ở đâu?
2. Vì sao backend phải là integration point?
3. Nếu Ably down nhưng DB vẫn sống, user experience nên degrade thế nào?
4. Nếu Cloudinary upload thành công nhưng update DB thất bại, xử lý cleanup ra sao?
5. Lab 2 có thật sự “tốt hơn” Lab 1 không?

Câu trả lời đúng phải đi tới kết luận:

> Không có provider tốt nhất, chỉ có kiến trúc phù hợp. 

---

# So sánh Lab 1 và Lab 2

## Góc nhìn triển khai

| Tiêu chí             | Lab 1: Supabase All-in-One | Lab 2: Distributed      |
| -------------------- | -------------------------- | ----------------------- |
| Tốc độ dựng          | Rất nhanh                  | Chậm hơn                |
| Số lượng config      | Ít                         | Nhiều                   |
| Debug                | Dễ hơn                     | Khó hơn                 |
| Coupling             | Cao                        | Thấp hơn                |
| Tính production-like | Vừa phải                   | Cao hơn                 |
| Bài học chính        | Speed & convenience        | Boundaries & resilience |

---

# Tổ chức buổi lab thực tế trên lớp

## Phương án hợp lý nhất

* **Lab 1:** làm chính trong buổi
* **Lab 2:** làm phần core trên lớp, phần failure + hoàn thiện cho bài tập

## Chia thời gian gợi ý

### Lab 1

* 30 phút setup
* 45 phút backend
* 30 phút frontend
* 20 phút realtime
* 20 phút failure test
* 15 phút review

### Lab 2

* 20 phút giải thích kiến trúc
* 30 phút setup providers
* 45 phút backend integration
* 25 phút frontend subscribe
* 30 phút simulate failures
* 20 phút so sánh với Lab 1

---

# Kết luận sư phạm

Nếu dạy đúng, 2 lab này sẽ làm người học thấy rất rõ:

* app chạy được chưa phải production
* service sống riêng, fail riêng
* backend là nơi orchestration
* config là thứ giết production nhanh nhất
* realtime không phải DB
* storage không phải DB
* distributed system không miễn phí, nó đổi **sự tiện lợi** lấy **khả năng kiểm soát**

Các ý này bám rất sát tinh thần bộ slide của bạn về external dependency, config-driven system, service boundary, all-in-one vs distributed, và production failure.   

