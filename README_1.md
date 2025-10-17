# API Документация

## Доступность методов

- **Публичные методы:** доступны по адресу `https://api.alephtrade.com/backend_wiki.` (и с любого источника).
- **Приватные методы:** доступны только по адресу `https://backendwiki.alephtrade.com` (или при прямом обращении к серверу, не через api.alephtrade.com).

Если запрос идёт с api.alephtrade.com — доступны только публичные методы. 
Если с backendwiki.alephtrade.com — доступны все методы.

---

## Публичные методы (доступны всегда)

### 1. Получить список файлов из S3 (СТАРЫЙ МЕТОД!!!!!!!!!!, устарел, см п.2)
- **Метод:** GET
- **URL:** `/api/list`
- **Описание:** Возвращает список файлов из S3-хранилища `wiki-docs`.
- **Пример запроса:**
    ```http
    GET https://api.alephtrade.com/api/list
    ```
- **Пример успешного ответа:**
    ```json
    [
      {
        "Key": "example.docx",
        "LastModified": "2025-10-08T12:00:00Z",
        "Size": 12345
      }
    ]
    ```
- **Пример ошибки:**
    ```json
    {
      "message": "Ошибка доступа к S3"
    }
    ```

---

### 2. Получить дерево структуры разделов
- **Метод:** GET
- **URL:** `/api/v2/tree`
- **Описание:** Возвращает дерево структуры (иерархия разделов).
- **Пример запроса:**
    ```http
    GET https://api.alephtrade.com/api/v2/tree
    ```
  - **Пример успешного ответа:**
      ```json
      [
        {
        "uuid": "e0fe3679-24f7-42ca-9401-394fc6318dc9",
        "name": "_Настройка почты на мобильных устройствах.pdf",
        "type": "file",
        "access": false,
        "s3_url": "https://storage.yandexcloud.net/wiki-docs/22cd4984-1a21-4a87-a752-474f70e33e96.pdf",
        "children": []
        }
    ]
    ```
- **Пример ошибки:**
    ```json
    {
      "message": "Ошибка получения структуры"
    }
    ```

---

## Приватные методы (только для backendwiki.alephtrade.com)

### 3. Загрузить файл в раздел
- **Метод:** POST
- **URL:** `/api/v2/upload_file`
- **Описание:** Загружает файл в выбранный раздел.
- **Параметры:**
    - `file` (file, обяз.) — файл для загрузки (multipart/form-data)
    - `parent_uuid` (uuid, не обяз.) — UUID родительской папки
    - `access` (int, не обяз.) — публичность (1 — публично, 0 — приватно)
- **Пример запроса:**
    ```http
    POST https://backendwiki.alephtrade.com/api/v2/upload_file
    Content-Type: multipart/form-data
    file: <binary>
    parent_uuid: 123e4567-e89b-12d3-a456-426614174000
    access: 1
    ```
- **Успешный ответ:**
    ```json
    {
    "message": "Файл успешно загружен",
    "structure": {
      "uuid": "38bafffb-bc0a-447e-b28e-73611a3e69f7",
      "object_uuid": "a01e8937-b04d-4638-b032-f25f11e659ed",
      "parent_structure": null,
      "name": "_Настройка почты на мобильных устройствах.pdf",
      "type": "file",
      "access": "0",
      "updated_at": "2025-10-15T12:08:35.000000Z",
      "created_at": "2025-10-15T12:08:35.000000Z"
    },
    "alepha_rag_state": "{\"status\":\"ok\",\"uuid_file\":\"38bafffb-bc0a-447e-b28e-73611a3e69f7\",\"wiki_url\":\"https://wiki.alephtrade.com/a01e8937-b04d-4638-b032-f25f11e659ed\"}\n"
    }
    ```
- **Ошибка (невалидный parent):**
    ```json
    {
      "message": "Родитель не найден"
    }
    ```
- **Ошибка валидации:**
    ```json
    {
      "message": "The file field is required."
    }
    ```

---

### 4. Создать папку
- **Метод:** POST
- **URL:** `/api/v2/create_folder`
- **Описание:** Создаёт новую папку в структуре.
- **Параметры:**
    - `name` (string, обяз.) — название папки
    - `parent_uuid` (uuid, не обяз.) — UUID родителя
    - `access` (int, не обяз.) — публичность (1 — публично, 0 — приватно)
- **Пример запроса:**
    ```http
    POST https://backendwiki.alephtrade.com/api/v2/create_folder
    Content-Type: application/json
    {
      "name": "Документы",
      "parent_uuid": "123e4567-e89b-12d3-a456-426614174000",
      "access": 1
    }
    ```
- **Успешный ответ:**
    ```json
    {
      "message": "Папка успешно создана",
      "structure": {
        "uuid": "8fd2093b-d4d2-43c7-aac4-6f79568f90e9",
        "object_uuid": null,
        "parent_structure": null,
        "name": "test",
        "type": "folder",
        "access": true,
        "updated_at": "2025-10-15T14:20:13.000000Z",
        "created_at": "2025-10-15T14:20:13.000000Z"
      }
    }
    ```
- **Ошибка (невалидный parent):**
    ```json
    {
    "message": "Указанный parent_uuid не существует"
    }
    ```

---

### 5. Удалить файл
- **Метод:** DELETE
- **URL:** `/api/v2/delete_file/{uuid}`
- **Описание:** Удаляет файл по UUID.
- **Пример запроса:**
    ```http
    DELETE https://backendwiki.alephtrade.com/api/v2/delete_file/38bafffb-bc0a-447e-b28e-73611a3e69f7
    ```
  - **Успешный ответ:**
      ```json
      {
        "message": "Файл успешно удалён (локально и из RAG)",
        "rag_response": {
          "status": "ok",
          "uuid_file": "a01e8937-b04d-4638-b032-f25f11e659ed"
        }
      }
    ```
- **Ошибка (файл не найден):**
    ```json
    {
      "message": "Файл не существует"
    }
    ```
- **Ошибка (не файл):**
    ```json
    {
      "message": "Этот метод удаляет только файлы"
    }
    ```

---

### 6. Удалить папку
- **Метод:** DELETE
- **URL:** `/api/v2/delete_folder/{uuid}`
- **Описание:** Удаляет папку по UUID.
- **Пример запроса:**
    ```http
    DELETE https://backendwiki.alephtrade.com/api/v2/delete_folder/123e4567-e89b-12d3-a456-426614174000
    ```
- **Успешный ответ:**
    ```json
    {
      "message": "Папка удалена"
    }
    ```
- **Ошибка (папка не найдена):**
    ```json
    {
      "message": "Папка не существует"
    }
    ```
- **Ошибка (не папка):**
    ```json
    {
      "message": "Этот метод удаляет только папки"
    }
    ```

---

### 7. Обновить структуру папки или файла
- **Метод:** PATCH
- **URL:** `/api/v2/update_structure/{uuid}`
- **Описание:** Обновляет параметры папки или файла (имя, доступ, родитель).
- **Параметры:**
    - `name` (string, не обяз.) — новое имя
    - `access` (int, не обяз.) — публичность (1 — публично, 0 — приватно)
    - `parent_uuid` (uuid, не обяз.) — новый родитель
- **Пример запроса:**
    ```http
    PATCH https://backendwiki.alephtrade.com/api/v2/update_structure/123e4567-e89b-12d3-a456-426614174000
    Content-Type: application/json
    {
      "name": "Новая папка",
      "access": 0,
      "parent_uuid": "321e4567-e89b-12d3-a456-426614174000"
    }
    ```
  - **Успешный ответ:**
     ```json
     {
       "message": "Элемент успешно обновлён",
       "structure": {
         "uuid": "c1bbe11e-7ec5-400d-ba3a-3dc6411fb966",
         "object_uuid": null,
         "parent_structure": null,
         "name": "перемещенная папка",
         "type": "folder",
         "access": false,
         "created_at": "2025-10-15T14:23:40.000000Z",
         "updated_at": "2025-10-15T14:23:50.000000Z"
       }
     }
    ```
- **Ошибка (элемент не найден):**
    ```json
    {
      "message": "Элемент не найден"
    }
    ```
- **Ошибка (невалидный parent):**
    ```json
    {
      "message": "Родитель не найден"
    }
    ```

---

### 8. Обновить файл
- **Метод:** PATCH
- **URL:** `/api/v2/update_file/{uuid}`
- **Описание:** Обновляет параметры файла (имя, доступ, родитель).
- **Параметры:**
    - `name` (string, не обяз.) — новое имя
    - `access` (int, не обяз.) — публичность (1 — публично, 0 — приватно)
    - `parent_uuid` (uuid, не обяз.) — новый родитель
- **Пример запроса:**
    ```http
    PATCH https://backendwiki.alephtrade.com/api/v2/update_file/123e4567-e89b-12d3-a456-426614174000
    Content-Type: application/json
    {
      "name": "file.txt",
      "access": 1,
      "parent_uuid": "321e4567-e89b-12d3-a456-426614174000"
    }
    ```
- **Успешный ответ:**
    ```json
    {
        "message": "Файл успешно обновлён",
        "structure": {
           "uuid": "e0fe3679-24f7-42ca-9401-394fc6318dc9",
           "object_uuid": "a01e87b9-dc23-47e7-8c00-65ac5ab2a63f",
           "parent_structure": "c1bbe11e-7ec5-400d-ba3a-3dc6411fb966",
           "name": "перемещенная файл",
           "type": "file",
           "access": false,
           "created_at": "2025-10-15T12:04:25.000000Z",
           "updated_at": "2025-10-15T14:25:55.000000Z"
        }
    }
    ```
- **Ошибка (файл не найден):**
    ```json
    {
      "message": "Файл не найден"
    }
    ```
- **Ошибка (не файл):**
    ```json
    {
      "message": "Этот метод предназначен только для файлов"
    }
    ```
- **Ошибка (невалидный parent):**
    ```json
    {
      "message": "Указанный parent_uuid не существует"
    }
    ```

---
