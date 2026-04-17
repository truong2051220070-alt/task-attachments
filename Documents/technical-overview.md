# Tài liệu kỹ thuật — Task Attachments

## 1. Tổng quan

Ứng dụng quản lý công việc (task) với khả năng đính kèm file và chat realtime. Được tổ chức theo kiến trúc monorepo tách biệt frontend/backend.

---

## 2. Kiến trúc tổng thể

```
task-attachments/
├── .env                    # Biến môi trường dùng chung
├── package.json            # Root — chạy cả 2 app (concurrently)
│
├── backend/                # Express API, port 3001
│   ├── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── controllers/
│       │   ├── taskController.ts
│       │   └── chatController.ts
│       ├── lib/
│       │   └── supabase.ts
│       └── types.ts
│
└── frontend/               # React + Vite, port 5173
    ├── vite.config.ts
    ├── package.json
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        ├── types.ts
        ├── components/
        │   ├── TaskForm.tsx
        │   ├── TaskList.tsx
        │   ├── TaskItem.tsx
        │   └── ChatBox.tsx
        ├── hooks/
        │   └── useRealtimeTasks.ts
        └── lib/
            └── supabase.ts
```

---

## 3. Tech Stack

### Backend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Runtime | Node.js (ESM) | >= 18 |
| Framework | Express.js | ^4.21 |
| Language | TypeScript | ~5.8 |
| Dev runner | tsx (watch mode) | ^4.21 |
| Database/Storage | Supabase | ^2.103 |
| File upload | Multer (memory storage) | ^2.1 |
| CORS | cors | ^2.8 |
| Env | dotenv | ^17.2 |

### Frontend
| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| UI Framework | React | ^19.0 |
| Build tool | Vite | ^6.2 |
| Language | TypeScript | ~5.8 |
| Styling | Tailwind CSS | ^4.1 |
| Animation | Motion | ^12.23 |
| Icons | Lucide React | ^0.546 |
| Realtime | Supabase JS | ^2.103 |

---

## 4. Biến môi trường

File `.env` đặt ở **root** của monorepo, được đọc bởi cả 2 app:

```env
# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Storage
STORAGE_BUCKET=task-attachments

# Backend CORS (tuỳ chọn, mặc định: http://localhost:5173)
FRONTEND_URL=http://localhost:5173
```

**Cách đọc:**
- Backend: `dotenv.config({ path: '../.env' })` — đọc file cha từ `backend/`
- Frontend: `loadEnv(mode, '..', '')` trong `vite.config.ts` — Vite tìm `.env` ở thư mục cha

---

## 5. API Endpoints

Base URL: `http://localhost:3001`

### Tasks

| Method | Endpoint | Mô tả | Body/Params |
|---|---|---|---|
| GET | `/api/tasks` | Lấy danh sách tasks | — |
| POST | `/api/tasks` | Tạo task mới (multipart) | `title`, `description`, `file?` |
| PATCH | `/api/tasks/:id/status` | Cập nhật trạng thái | `{ status: "open" \| "in_progress" \| "done" }` |
| POST | `/api/tasks/:id/attachment` | Upload file đính kèm | `file` (multipart) |
| DELETE | `/api/tasks/:id/attachment` | Xóa file đính kèm | — |

### Messages (Chat)

| Method | Endpoint | Mô tả | Body |
|---|---|---|---|
| GET | `/api/messages` | Lấy 50 tin nhắn gần nhất | — |
| POST | `/api/messages` | Gửi tin nhắn | `{ user_name, content }` |

---

## 6. Data Models

### Task
```ts
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
}
```

### ChatMessage
```ts
interface ChatMessage {
  id: string;
  user_name: string;
  content: string;
  created_at: string;   // ISO 8601
}
```

---

## 7. Luồng dữ liệu

### Tạo Task với file đính kèm
```
Frontend (TaskForm)
  → POST /api/tasks (multipart/form-data)
  → Backend: insert task vào Supabase DB
  → Backend: upload file vào Supabase Storage (bucket: task-attachments)
  → Backend: cập nhật task với attachment_url, attachment_name
  → Response: task object đầy đủ
  → Frontend: dispatch 'tasks-changed' event → TaskList refetch
```

### Realtime Tasks
```
Frontend (useRealtimeTasks hook)
  → Subscribe Supabase Realtime channel 'tasks-all'
  → Lắng nghe postgres_changes event (INSERT/UPDATE/DELETE) trên table 'tasks'
  → Auto refetch khi có thay đổi
```

### Realtime Chat
```
Frontend (ChatBox)
  → Subscribe Supabase Realtime channel 'room:public'
  → Lắng nghe postgres_changes INSERT trên table 'messages'
  → Track presence (online users)
  → Tin nhắn hiển thị ngay khi nhận từ Realtime (không cần poll)
```

---

## 8. Supabase Setup

### Database Tables

**tasks**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**messages**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Storage
- Tạo bucket tên `task-attachments` (hoặc theo `STORAGE_BUCKET` trong `.env`)
- Set Public bucket để `attachment_url` có thể truy cập trực tiếp

### Realtime
Bật Realtime cho 2 tables: `tasks`, `messages`

---

## 9. Chạy ứng dụng

### Development
```bash
# Cài dependencies (lần đầu)
npm run install:all

# Chạy cả 2 app
npm run dev

# Hoặc riêng từng app
cd backend && npm run dev    # http://localhost:3001
cd frontend && npm run dev   # http://localhost:5173
```

Frontend proxy: Mọi request `/api/*` từ port 5173 được Vite proxy tới `http://localhost:3001`.

### Build Production
```bash
cd frontend && npm run build   # Output: frontend/dist/
```

---

## 10. Bảo mật

- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở backend — không bao giờ expose ra frontend
- Frontend chỉ dùng `SUPABASE_ANON_KEY` (public, an toàn khi expose)
- CORS backend chỉ cho phép origin từ `FRONTEND_URL`
- File upload xử lý bằng multer memory storage (không lưu disk tạm)
