# API Документация

## Доступность методов

- **Публичные методы:** доступны по адресу `https://api.alephtrade.com/backend_wiki` (и с любого источника).
- **Приватные методы:** доступны только по адресу `https://backendwiki.alephtrade.com` (или при прямом обращении к серверу, не через api.alephtrade.com).

Если запрос идёт с api.alephtrade.com — доступны только публичные методы. Если с backendwiki.alephtrade.com — доступны все методы.

---

## Публичные методы (доступны всегда)

### 2. Получить дерево структуры разделов
- **Метод:** GET
- **URL:** `/api/v2/tree`
- **Описание:** Возвращает дерево структуры (иерархия разделов).
- **Пример запроса:**
    ```http
    GET https://api.alephtrade.com/backend_wiki/api/v2/tree
    ```
- **Пример успешного ответа:**
    ```json
    [
      {
        "id": 1,
        "name": "Главный раздел",
        "children": [
          {
            "id": 2,
            "name": "Подраздел",
            "children": []
          }
        ]
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
      "structure": { ... },
      "alepha_rag_state": "..."
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
      "structure": { ... }
    }
    ```
- **Ошибка (невалидный parent):**
    ```json
    {
      "message": "Родитель не найден"
    }
    ```

---

### 5. Удалить файл
- **Метод:** DELETE
- **URL:** `/api/v2/delete_file/{uuid}`
- **Описание:** Удаляет файл по UUID.
- **Пример запроса:**
    ```http
    DELETE https://backendwiki.alephtrade.com/api/v2/delete_file/123e4567-e89b-12d3-a456-426614174000
    ```
- **Успешный ответ:**
    ```json
    {
      "message": "Файл успешно удалён"
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
      "structure": { ... }
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
      "structure": { ... }
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
      "message": "Родитель не найден"
    }
    ```

---

> Если потребуется добавить новые методы или уточнить параметры — обновите этот файл по аналогии.
