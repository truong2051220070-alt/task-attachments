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
