# Tổng quan hệ thống VisioX

## 1. Luồng chính

Đây là luồng dễ nhớ nhất của toàn hệ thống:

```mermaid
flowchart LR
    User([Người dùng])
    FE[Frontend<br/>Next.js :3000]
    API[Django API<br/>:8000]
    DB[(PostgreSQL)]
    Storage[(Media / Model Storage)]

    User --> FE
    FE -->|REST /api/v1 + JWT| API
    API --> DB
    API --> Storage
```

- Frontend chỉ giao tiếp với Django API.
- Django API đọc/ghi dữ liệu trong PostgreSQL và Storage.
- Tác vụ nhanh được xử lý ngay trong request; tác vụ lâu được chuyển sang Celery.

## 2. Luồng tổng thể end-to-end

```mermaid
flowchart TB
    User([Người dùng])

    subgraph Browser[1. Trình duyệt]
        FE[Next.js Frontend]
        Workspace[Projects / Datasets / Annotation]
        Monitor[Training / Deployment Monitor]
    end

    subgraph Web[2. Backend đồng bộ]
        API[Django REST API]
        Auth[Auth + JWT]
        Domain[Projects / Datasets / Annotations]
        Train[Training / Registry / Deployment]
    end

    subgraph Data[3. Dữ liệu]
        DB[(PostgreSQL)]
        Storage[(Media / Labels / Models)]
    end

    subgraph Background[4. Xử lý nền]
        Redis[(Redis Queue)]
        Celery[Celery Worker]
        Beat[Celery Beat]
        GPU[GPU Training Agent]
    end

    subgraph Serving[5. Phục vụ mô hình]
        Registry[Model Registry]
        Endpoint[Inference Endpoint]
        Prediction[Predictions / Monitoring]
    end

    User --> FE
    FE --> Workspace
    FE --> Monitor
    Workspace -->|REST + JWT| API
    Monitor -->|Polling / Actions| API

    API --> Auth
    API --> Domain
    API --> Train
    Auth --> DB
    Domain --> DB
    Domain --> Storage
    Train --> DB

    Domain -->|Import / Augment / Cache| Redis
    Train -->|Training / Drift / Webhook| Redis
    Beat -->|Scheduled tasks| Redis
    Redis --> Celery
    Celery -->|Dataset tasks| DB
    Celery -->|Submit training| GPU
    GPU -->|Metrics / Status| API
    GPU -->|best.pt / best.onnx| Storage

    Storage --> Registry
    Train --> Registry
    Registry --> Endpoint
    Endpoint --> Prediction
    Prediction -->|Logs / Drift feedback| API
    API -->|Cập nhật giao diện| Monitor
```

Luồng trên được chia thành năm tầng:

1. Người dùng thao tác trên frontend.
2. Django API xác thực và xử lý nghiệp vụ đồng bộ.
3. PostgreSQL lưu metadata; Storage lưu media, labels và model artifacts.
4. Công việc dài được chuyển qua Redis cho Celery; training được Celery điều phối sang GPU Agent.
5. Model hoàn tất được đăng ký, triển khai thành inference endpoint và gửi monitoring feedback về API.

## 3. Celery nằm ở đâu?

```mermaid
flowchart LR
    FE[Frontend]
    API[Django API]
    Redis[(Redis<br/>Hàng đợi)]
    Worker[Celery Worker<br/>queue: celery, datasets]
    Beat[Celery Beat<br/>Lập lịch]
    GPU[GPU Training Agent<br/>:8002]
    DB[(PostgreSQL)]
    Storage[(Storage)]

    FE -->|1. Gửi yêu cầu| API
    API -->|2. Đẩy task nền| Redis
    Beat -->|Task định kỳ| Redis
    Redis -->|3. Giao task| Worker
    Worker -->|4a. Import / Augment / Cache| DB
    Worker -->|4b. Gửi training job| GPU
    GPU -->|5. Metrics / trạng thái| API
    GPU -->|6. best.pt / best.onnx| Storage
```

Celery không trực tiếp hiển thị trên frontend và không trực tiếp huấn luyện model. Celery có nhiệm vụ nhận việc nền từ Redis, xử lý tác vụ dataset hoặc điều phối training job sang GPU Training Agent.

| Thành phần | Chạy ở đâu? | Nhiệm vụ |
|---|---|---|
| Django API | Service `api`, cổng `8000` | Nhận request và tạo task nền |
| Redis | Service hạ tầng | Broker và result backend của Celery |
| Celery Worker | Service `worker` | Chạy queue `celery,datasets` |
| Celery Beat | Service `beat` | Tạo task theo lịch |
| GPU Training Agent | Service riêng, cổng `8002` | Huấn luyện model trên GPU |

Các task Celery hiện tại:

- Import dataset.
- Augmentation dataset.
- Build/clear label cache.
- Điều phối training job sang GPU agent.
- Kiểm tra model drift.
- Gửi webhook.

> Khi `USE_CELERY=False`, một số tác vụ dataset chạy bằng background thread. Môi trường production nên dùng `USE_CELERY=True`.

## 4. Luồng nghiệp vụ computer vision

```mermaid
flowchart LR
    A[1. Upload dữ liệu] --> B[2. Annotation]
    B --> C[3. Verify và Split]
    C --> D[4. Augmentation]
    D --> E[5. Training]
    E --> F[6. Model Registry]
    F --> G[7. Deployment]
    G --> H[8. Inference]
```

### Upload đến training

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant FE as Frontend
    participant API as Django API
    participant Redis
    participant Celery as Celery Worker
    participant GPU as GPU Agent

    User->>FE: Upload và gán nhãn dữ liệu
    FE->>API: Lưu dataset / annotations
    User->>FE: Bắt đầu training
    FE->>API: Tạo TrainingJob
    API->>Redis: Đẩy run_training_job
    Redis->>Celery: Giao task
    Celery->>GPU: Submit training job
    GPU-->>API: Callback metrics và trạng thái
    API-->>FE: Frontend polling dữ liệu mới
```

## 5. Luồng xác thực

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant FE as Frontend
    participant API as Django API

    User->>FE: Đăng nhập
    FE->>API: POST /api/v1/auth/login/
    API-->>FE: Access token + Refresh token
    FE->>API: Request với Bearer token

    alt Access token hết hạn
        API-->>FE: 401
        FE->>API: POST /api/v1/auth/token/refresh/
        API-->>FE: Access token mới
        FE->>API: Gửi lại request
    end
```

## 6. Cấu hình quan trọng

| Cấu hình | Giá trị / ý nghĩa |
|---|---|
| Frontend | `http://localhost:3000` |
| Django API | `http://localhost:8000` |
| GPU Training Agent | `TRAINING_AGENT_URL`, mặc định cổng `8002` |
| API prefix | `/api/v1/` |
| Celery broker | `CELERY_BROKER_URL` |
| Celery result backend | `CELERY_RESULT_BACKEND` |
| Bật Celery | `USE_CELERY=True` |

## 7. Tóm tắt một câu

> Frontend gọi Django API; Django xử lý việc nhanh, đẩy việc lâu qua Redis cho Celery; Celery xử lý dataset hoặc gửi job sang GPU Agent; kết quả được lưu về Database/Storage và hiển thị lại trên Frontend.
