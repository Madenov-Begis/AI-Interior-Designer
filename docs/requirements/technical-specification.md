# Техническое задание

## Веб-сервис AI-визуализации дизайна интерьера

## 1. Общая информация

### 1.1. Название проекта

Рабочее название: **AI Interior Designer**.

Финальное название, логотип, домен и фирменный стиль определяются отдельно.

### 1.2. Назначение системы

Необходимо разработать веб-приложение для генерации фотореалистичного дизайна интерьера с помощью Google Vertex AI и моделей Gemini.

Пользователь загружает фотографию помещения, при необходимости наносит визуальные указания, добавляет изображения-референсы, описывает желаемые изменения и получает сгенерированную визуализацию обновлённого интерьера.

Основная задача AI — изменить дизайн помещения, сохранив:

* исходный ракурс камеры;
* геометрию помещения;
* расположение стен;
* расположение дверей и окон;
* основные архитектурные элементы;
* пропорции комнаты.

Система должна предоставлять полный цикл работы:

1. авторизация через Google;
2. загрузка фотографии помещения;
3. визуальная разметка изображения;
4. загрузка референсов файлами;
5. добавление референсов по ссылкам;
6. написание текстовой инструкции;
7. выбор модели AI;
8. выбор формата изображения;
9. генерация дизайна;
10. наложение водяного знака;
11. сравнение изображений «До» и «После»;
12. скачивание результата;
13. хранение истории генераций;
14. учёт дневных лимитов;
15. поддержка обычного и VIP-доступа;
16. административное управление пользователями и настройками.

---

# 2. Технологический стек

## 2.1. Основной стек

* Next.js с App Router;
* React;
* TypeScript;
* REST API через Next.js Route Handlers;
* PostgreSQL в Supabase;
* Prisma ORM;
* Supabase Auth;
* Supabase Storage;
* Google Vertex AI;
* Google Gemini image models;
* Tailwind CSS;
* shadcn/ui;
* React Hook Form;
* Zod;
* TanStack Query;
* HTML Canvas, Fabric.js или Konva.js для редактора изображения.

## 2.2. Архитектура

Приложение должно состоять из следующих логических частей:

```text
Frontend
    ↓
Next.js REST API
    ↓
Сервис авторизации
    ↓
Бизнес-логика
    ↓
Prisma ORM
    ↓
Supabase PostgreSQL
```

Работа с файлами:

```text
Frontend
    ↓
Next.js REST API
    ↓
Supabase Storage
```

Генерация изображения:

```text
Frontend
    ↓
Next.js REST API
    ↓
Generation Service
    ↓
Google Vertex AI
    ↓
Обработка результата
    ↓
Supabase Storage
    ↓
PostgreSQL
```

Frontend не должен напрямую обращаться к Vertex AI.

Все секретные ключи и серверные credentials должны находиться только на серверной стороне.

---

# 3. Типы пользователей

## 3.1. Неавторизованный пользователь

Неавторизованный пользователь может:

* открыть главную страницу;
* просмотреть описание сервиса;
* посмотреть примеры результатов;
* посмотреть информацию о тарифах;
* авторизоваться через Google.

Неавторизованный пользователь не может создавать генерации и загружать изображения.

## 3.2. Обычный пользователь

Обычный пользователь может:

* авторизоваться через Google;
* создавать проекты дизайна;
* загружать исходные фотографии;
* использовать редактор Visual Prompting;
* загружать референсы;
* добавлять референсы по URL;
* писать текстовые инструкции;
* выбирать доступную AI-модель;
* выбирать формат изображения;
* запускать генерацию;
* просматривать результат;
* сравнивать исходное и итоговое изображения;
* скачивать результат;
* просматривать историю;
* повторять предыдущую генерацию;
* удалять свои проекты;
* использовать доступный дневной лимит.

## 3.3. VIP-пользователь

VIP-пользователь получает расширенные возможности:

* отсутствие дневного лимита или увеличенный лимит;
* доступ к более качественным AI-моделям;
* увеличенное количество референсов;
* увеличенный размер загружаемых файлов;
* генерация в повышенном разрешении;
* возможность скачивания результата без водяного знака;
* приоритетная обработка задач.

Все VIP-ограничения должны задаваться через настройки тарифа в базе данных.

## 3.4. Администратор

Администратор может:

* просматривать пользователей;
* искать пользователей;
* блокировать пользователей;
* разблокировать пользователей;
* назначать VIP-статус;
* изменять тариф пользователя;
* задавать индивидуальные лимиты;
* просматривать проекты;
* просматривать генерации;
* просматривать ошибки генерации;
* управлять доступными AI-моделями;
* управлять системными уведомлениями;
* управлять водяным знаком;
* вручную возвращать пользователю списанную генерацию;
* просматривать статистику использования;
* просматривать расходы на AI;
* управлять глобальными настройками приложения.

---

# 4. Авторизация через Google

## 4.1. Способ авторизации

В системе используется только Google OAuth через Supabase Auth.

Другие способы авторизации не реализуются:

* Email и пароль;
* Magic Link;
* телефон;
* Telegram;
* Apple;
* Facebook;
* GitHub.

На странице входа должна находиться одна основная кнопка:

```text
Продолжить с Google
```

## 4.2. Процесс авторизации

1. Пользователь нажимает «Продолжить с Google».
2. Пользователь перенаправляется на страницу Google OAuth.
3. После успешной авторизации Google перенаправляет пользователя обратно в приложение.
4. Supabase создаёт или восстанавливает сессию.
5. Приложение проверяет наличие профиля пользователя.
6. Если профиль отсутствует, он автоматически создаётся.
7. Пользователь перенаправляется в личный кабинет.

## 4.3. Данные профиля

При первой авторизации сохраняются:

* Supabase User ID;
* email;
* имя;
* фамилия, если доступна;
* отображаемое имя;
* URL Google-аватара;
* дата регистрации;
* дата последнего входа;
* роль;
* статус;
* тариф;
* часовой пояс.

## 4.4. Сессия

Авторизация должна работать через защищённые HTTP-only cookies.

Сессия должна поддерживаться на:

* Server Components;
* Route Handlers;
* Middleware;
* Client Components.

Защищённые маршруты:

```text
/app
/app/design
/app/projects
/app/projects/[id]
/app/history
/app/profile
/admin
/admin/*
```

## 4.5. Проверка доступа

Backend не должен доверять следующим данным от клиента:

* `userId`;
* `role`;
* `plan`;
* `isVip`;
* количество оставшихся генераций;
* принадлежность проекта пользователю.

Все данные должны проверяться сервером по текущей Supabase-сессии.

Роль и тариф нельзя определять по пользовательским Google metadata. Эти данные должны храниться в собственной таблице профилей.

## 4.6. Выход

Пользователь может выйти из аккаунта.

После выхода:

* Supabase-сессия удаляется;
* cookies очищаются;
* защищённые страницы становятся недоступны;
* пользователь перенаправляется на главную страницу.

---

# 5. Основной пользовательский интерфейс

Основная рабочая страница должна содержать три последовательных этапа:

```text
1. Фото помещения
2. Референсы
3. Инструкция
```

Также должны присутствовать настройки модели и формата изображения.

---

# 6. Загрузка фотографии помещения

## 6.1. Функциональность

Пользователь должен загрузить одну основную фотографию помещения.

Поддерживаемые форматы:

* JPG;
* JPEG;
* PNG;
* WEBP.

## 6.2. Ограничения

Значения по умолчанию:

* максимальный размер: 15 МБ;
* минимальная ширина: 512 px;
* минимальная высота: 512 px;
* максимальная сторона перед обработкой: 6000 px.

Ограничения должны настраиваться через тариф или системные настройки.

## 6.3. Проверка файла

Backend должен проверить:

* расширение;
* реальный MIME-тип;
* сигнатуру файла;
* размер;
* возможность декодировать изображение;
* ширину и высоту;
* отсутствие повреждения.

Нельзя доверять только расширению файла.

## 6.4. Обработка изображения

После загрузки необходимо:

* учесть EXIF-поворот;
* привести изображение к RGB;
* удалить EXIF и лишние metadata;
* создать оптимизированную копию;
* сохранить оригинал;
* создать preview;
* вычислить checksum.

## 6.5. Хранение

Изображение сохраняется в приватный bucket Supabase Storage.

Структура пути:

```text
users/{userId}/projects/{projectId}/source/{fileId}.{extension}
```

В базе данных сохраняются:

* bucket;
* storage path;
* MIME-тип;
* размер;
* ширина;
* высота;
* checksum;
* дата загрузки.

Публичный постоянный URL хранить не требуется.

Для отображения файлов должны использоваться временные Signed URLs.

---

# 7. Visual Prompting

## 7.1. Назначение

Visual Prompting позволяет пользователю рисовать непосредственно поверх фотографии помещения и визуально указывать AI, какие части изображения необходимо изменить.

## 7.2. Включение

После загрузки изображения пользователь может включить переключатель:

```text
Редактировать фотографию
```

## 7.3. Инструменты

Редактор должен поддерживать:

* ручку;
* полупрозрачный маркер;
* прямоугольник;
* выбор цвета;
* выбор толщины линии;
* отмену действия;
* возврат отменённого действия;
* удаление выделенного объекта;
* очистку всей разметки;
* восстановление исходного изображения.

## 7.4. Поведение

Разметка должна накладываться поверх исходного изображения.

Необходимо сохранять:

* исходное изображение;
* изображение с разметкой;
* JSON-состояние canvas;
* информацию о том, использовалась ли визуальная разметка.

Исходное изображение не должно перезаписываться.

## 7.5. Адаптивность

Редактор должен корректно работать:

* на компьютере;
* на планшете;
* на мобильном устройстве;
* с мышью;
* с сенсорным вводом.

При масштабировании отображаемого изображения координаты разметки должны корректно преобразовываться относительно оригинального размера.

---

# 8. Референсные изображения

## 8.1. Назначение

Референсы используются для передачи AI информации о:

* стиле интерьера;
* мебели;
* цветах;
* материалах;
* светильниках;
* декоре;
* отделке;
* конкретных предметах.

## 8.2. Добавление файлов

Пользователь может загрузить несколько изображений.

По умолчанию:

```text
до 10 референсов
```

Лимит зависит от тарифа.

Поддерживаемые форматы:

* JPG;
* JPEG;
* PNG;
* WEBP.

## 8.3. Управление референсами

Пользователь должен иметь возможность:

* просмотреть preview;
* удалить изображение;
* изменить порядок;
* открыть изображение в увеличенном виде;
* добавить новые изображения;
* очистить список.

В AI-запрос должны передаваться изображения в порядке, установленном пользователем.

## 8.4. Хранение

Путь в Supabase Storage:

```text
users/{userId}/projects/{projectId}/references/{fileId}.{extension}
```

Каждый референс хранится отдельной записью в базе.

---

# 9. Добавление референсов по URL

## 9.1. Интерфейс

Пользователь может открыть вкладку:

```text
Ссылки
```

В текстовое поле можно вставить одну или несколько ссылок, каждую с новой строки.

## 9.2. Backend-обработка

Для каждой ссылки система должна:

1. нормализовать URL;
2. проверить протокол;
3. проверить безопасность адреса;
4. выполнить HTTP-запрос;
5. определить, является ли URL прямой ссылкой на изображение;
6. если это HTML-страница — найти изображение;
7. скачать изображение;
8. проверить его формат;
9. оптимизировать;
10. сохранить в Supabase Storage;
11. добавить в список референсов.

## 9.3. Порядок поиска изображения

Если URL ведёт на HTML-страницу, изображение ищется в следующем порядке:

1. `og:image`;
2. `twitter:image`;
3. JSON-LD с данными товара;
4. основное изображение товара;
5. наиболее крупное подходящее изображение страницы.

## 9.4. Прямые ссылки

Если URL заканчивается на:

```text
.jpg
.jpeg
.png
.webp
.avif
```

система должна попытаться скачать изображение напрямую.

## 9.5. Защита от SSRF

Запрещены запросы к:

* localhost;
* loopback IP;
* приватным сетям;
* link-local IP;
* metadata endpoints облачных провайдеров;
* внутренним доменам;
* `file://`;
* `ftp://`;
* нестандартным небезопасным протоколам.

Необходимо повторно проверять IP после каждого redirect.

## 9.6. Ограничения

* максимальное количество URL определяется тарифом;
* timeout одного запроса: до 15 секунд;
* максимальное количество redirects: 5;
* максимальный размер скачиваемого файла: 15 МБ;
* запросы выполняются только на сервере.

## 9.7. Усиленный поиск

Для сайтов, где изображение загружается через JavaScript, может использоваться отдельный browser worker.

Данная функция должна быть изолирована от основного Next.js-приложения.

Возможные технологии:

* Playwright;
* Browserless;
* отдельный scraping-worker;
* внешний browser automation service.

---

# 10. Текстовая инструкция

## 10.1. Поле инструкции

Пользователь должен описать желаемый результат в текстовом поле:

```text
Техническое задание для AI
```

## 10.2. Значение по умолчанию

```text
Сделай современный ремонт. Используй предметы интерьера из референсов. Не меняй ракурс, пропорции и геометрию помещения.
```

## 10.3. Ограничения

* минимальная длина: 3 символа;
* максимальная длина: 4000 символов;
* удаление лишних пробелов;
* обязательная серверная валидация;
* хранение первоначального текста;
* хранение итогового prompt, переданного модели.

## 10.4. Повторное использование

Пользователь может:

* повторно использовать прошлую инструкцию;
* изменить инструкцию;
* создать новую генерацию на основе предыдущей;
* скопировать проект.

---

# 11. Выбор AI-модели

## 11.1. Модели

В интерфейсе отображаются модели, разрешённые администратором.

Примерный перечень:

```text
Gemini 3 Pro Image Preview
Gemini 2.5 Flash Image
```

Фактические model IDs должны храниться в базе данных или конфигурации.

## 11.2. Настройки модели

Для каждой модели хранятся:

* ID;
* provider;
* model ID в Vertex AI;
* название для пользователя;
* описание;
* активность;
* доступный тариф;
* стоимость одной генерации;
* timeout;
* максимальное количество референсов;
* максимальный размер входных файлов;
* поддерживаемые форматы;
* поддержка Visual Prompting;
* приоритет;
* статус preview или production;
* дата последнего обновления.

## 11.3. Проверка

Backend должен проверять:

* существует ли модель;
* активна ли она;
* доступна ли она тарифу;
* поддерживает ли выбранные параметры.

Нельзя выполнять запрос к произвольной модели, переданной клиентом.

---

# 12. Выбор формата изображения

Доступные форматы:

```text
1:1
16:9
9:16
4:3
3:4
```

Формат по умолчанию:

```text
16:9
```

Backend должен проверять формат по фиксированному allowlist или настройкам модели.

---

# 13. Запуск генерации

## 13.1. Кнопка

Основная кнопка:

```text
Визуализировать дизайн
```

## 13.2. Предварительные проверки

Перед запуском Frontend должен проверить:

* загружено ли исходное изображение;
* введена ли инструкция;
* выбрана ли модель;
* выбран ли формат;
* не превышен ли лимит референсов.

Backend повторно выполняет все проверки независимо от Frontend.

## 13.3. REST endpoint

```http
POST /api/v1/generations
```

Пример запроса:

```json
{
  "projectId": "uuid",
  "modelId": "uuid",
  "aspectRatio": "16:9",
  "prompt": "Сделай интерьер в современном стиле",
  "useVisualPrompt": true,
  "referenceIds": [
    "uuid",
    "uuid"
  ]
}
```

## 13.4. Серверная последовательность

Backend должен:

1. проверить сессию;
2. получить пользователя;
3. проверить статус аккаунта;
4. проверить роль и тариф;
5. проверить владение проектом;
6. проверить исходное изображение;
7. проверить prompt;
8. проверить модель;
9. проверить формат;
10. проверить референсы;
11. проверить дневной лимит;
12. проверить количество параллельных задач;
13. зарезервировать генерацию;
14. создать запись генерации;
15. поставить задачу на обработку;
16. вернуть ID задачи.

Ответ:

```json
{
  "data": {
    "id": "uuid",
    "status": "QUEUED"
  }
}
```

---

# 14. Статусы генерации

Поддерживаемые статусы:

```text
QUEUED
PROCESSING
SUCCEEDED
FAILED
CANCELLED
REJECTED
```

Описание:

* `QUEUED` — задача поставлена в очередь;
* `PROCESSING` — запрос выполняется;
* `SUCCEEDED` — изображение успешно создано;
* `FAILED` — произошла техническая ошибка;
* `CANCELLED` — задача отменена;
* `REJECTED` — запрос отклонён системой или safety-фильтрами.

Дополнительные временные значения:

* дата постановки в очередь;
* дата начала обработки;
* дата завершения;
* продолжительность;
* количество попыток.

---

# 15. Очередь генераций

## 15.1. Требование

Генерация изображений должна выполняться в фоне через очередь задач.

Не рекомендуется держать HTTP-соединение открытым на всё время генерации.

## 15.2. Возможные технологии

* Inngest;
* Trigger.dev;
* Upstash QStash;
* BullMQ с Redis;
* Vercel Workflow;
* отдельный Node.js worker;
* Google Cloud Tasks.

## 15.3. Обработка

```text
API создаёт Generation
    ↓
Статус QUEUED
    ↓
Worker получает задачу
    ↓
Статус PROCESSING
    ↓
Выполняется запрос в Vertex AI
    ↓
Результат сохраняется
    ↓
Статус SUCCEEDED
```

## 15.4. Повторные попытки

Повторять запрос при:

* timeout;
* HTTP 429;
* HTTP 500;
* HTTP 502;
* HTTP 503;
* HTTP 504;
* временной сетевой ошибке.

Не повторять при:

* safety rejection;
* невалидном изображении;
* неподдерживаемой модели;
* неправильной конфигурации;
* отсутствии прав;
* отключённом биллинге;
* невалидном prompt.

Максимальное количество попыток:

```text
3
```

Использовать exponential backoff.

---

# 16. Интеграция с Google Vertex AI

## 16.1. Авторизация сервера

Google Cloud credentials должны быть доступны только серверной части.

Запрещено:

* передавать service account key в браузер;
* хранить секретный ключ в публичном Storage;
* использовать секреты в `NEXT_PUBLIC_*`;
* получать access token на клиенте;
* передавать access token пользователю.

Предпочтительные варианты:

* Workload Identity Federation;
* runtime service account;
* service account credentials в защищённых переменных окружения.

## 16.2. Сервисный слой

Необходимо создать абстракцию:

```ts
interface ImageGenerationProvider {
  generate(input: GenerationInput): Promise<GenerationOutput>;
}
```

Реализация:

```text
VertexGeminiImageProvider
```

В дальнейшем должна быть возможность добавить другие реализации без изменения основной бизнес-логики:

```text
VertexImagenProvider
OpenAIImageProvider
```

## 16.3. Входные данные

В AI передаются:

* текстовая системная инструкция;
* текст пользователя;
* исходное изображение комнаты;
* размеченное изображение, если Visual Prompting включён;
* референсы;
* формат;
* параметры выбранной модели.

## 16.4. Prompt без визуальной разметки

```text
Create a high-quality photorealistic interior redesign based on the provided source room image.

Core requirements:
- Preserve the original camera angle.
- Preserve the room geometry and proportions.
- Preserve the position of walls, windows, doors and structural elements.
- Do not change the room layout unless explicitly requested.
- Apply the user's requested interior style and changes.
- Use relevant furniture, materials, colors, lighting and decorative elements from the reference images.
- The final result must look realistic and professionally visualized.
- Do not add text, labels, logos or artificial watermarks.

User instructions:
{USER_PROMPT}
```

## 16.5. Prompt с визуальной разметкой

```text
Create a high-quality photorealistic interior redesign based on the provided source room image.

The source image contains visual markings created by the user.
Treat lines, highlighted areas and rectangles as spatial instructions.
Use these markings to understand which areas and objects should be changed.

Core requirements:
- Preserve the original camera angle.
- Preserve the room geometry and proportions.
- Follow the user's visual markings.
- Modify primarily the marked areas.
- Apply the user's written instructions.
- Use relevant objects, materials, colors and styles from the reference images.
- Do not reproduce the drawings or markings in the final image.
- Do not add text, labels, logos or artificial watermarks.

User instructions:
{USER_PROMPT}
```

## 16.6. Обработка ответа

После получения ответа необходимо:

1. проверить HTTP status;
2. проверить структуру ответа;
3. проверить наличие изображения;
4. определить MIME-тип;
5. декодировать данные;
6. проверить валидность изображения;
7. сохранить исходный AI-результат;
8. создать пользовательскую версию;
9. при необходимости наложить водяной знак;
10. сохранить metadata;
11. обновить статус задачи;
12. зафиксировать использование лимита.

---

# 17. Обработка изображений

## 17.1. До отправки в AI

Необходимо:

* применить EXIF rotation;
* конвертировать изображение в RGB;
* уменьшить разрешение при необходимости;
* сохранить пропорции;
* удалить metadata;
* ограничить качество;
* проверить итоговый размер.

## 17.2. Рекомендуемое рабочее разрешение

По умолчанию:

```text
до 2048 × 2048 px
```

Фактическое ограничение должно зависеть от выбранной AI-модели.

## 17.3. Референсы

Референсные изображения также должны быть оптимизированы перед передачей в AI.

Система не должна изменять оригиналы в Storage.

---

# 18. Водяной знак

## 18.1. Назначение

Для обычных пользователей на итоговое изображение должен накладываться фирменный водяной знак.

## 18.2. Настройки

Администратор может определить:

* включён ли водяной знак;
* файл логотипа;
* позицию;
* ширину;
* прозрачность;
* отступ справа;
* отступ снизу;
* тарифы, для которых он применяется.

## 18.3. Поведение по тарифам

Пример:

```text
FREE — водяной знак включён
VIP — водяной знак отключён
ADMIN — водяной знак отключён
```

## 18.4. Обработка

Водяной знак накладывается на сервере после успешной генерации.

Необходимо хранить:

* оригинальный AI-результат;
* пользовательскую версию с водяным знаком.

Обычный пользователь не должен иметь доступ к оригинальному файлу без водяного знака.

---

# 19. Результат генерации

После успешной генерации пользователь должен увидеть:

* уведомление об успешном завершении;
* итоговое изображение;
* исходное изображение;
* сравнение «До / После»;
* кнопку скачивания;
* кнопку повторной генерации;
* кнопку создания вариации;
* информацию о модели;
* информацию о формате;
* использованный prompt;
* дату генерации.

---

# 20. Сравнение «До / После»

Компонент сравнения должен содержать:

* исходное изображение;
* итоговое изображение;
* вертикальный draggable slider;
* подпись «До»;
* подпись «После»;
* поддержку мыши;
* поддержку touch;
* адаптивность;
* синхронный размер изображений.

Если компонент сравнения недоступен, изображения должны отображаться рядом или последовательно.

---

# 21. Скачивание результата

Кнопка:

```text
Скачать результат
```

Файл должен отдаваться с правильными:

* расширением;
* MIME-типом;
* именем.

Пример:

```text
interior-design-2026-07-20.jpg
image/jpeg
```

Скачивание должно выполняться через защищённый endpoint или Signed URL.

Backend обязан проверить, что пользователь имеет право на файл.

---

# 22. Дневные лимиты

## 22.1. Обычный тариф

По умолчанию:

```text
10 генераций в сутки
```

## 22.2. VIP-тариф

VIP может иметь:

* неограниченное количество;
* либо увеличенный лимит.

Значение должно задаваться в таблице тарифов.

## 22.3. Отображение

В интерфейсе необходимо показывать:

```text
Использовано сегодня: 3 из 10
```

При достижении лимита:

```text
Дневной лимит исчерпан.
Доступ будет восстановлен после начала следующего дня.
```

Также должна отображаться кнопка перехода к покупке VIP.

## 22.4. Часовой пояс

Расчёт дневного лимита выполняется по часовому поясу:

```text
Asia/Tashkent
```

Все даты в базе хранятся в UTC.

## 22.5. Резервирование

Перед запуском AI необходимо зарезервировать одну генерацию.

Статусы резерва:

```text
RESERVED
CONSUMED
REFUNDED
EXPIRED
```

## 22.6. Правила

* успешная генерация — `CONSUMED`;
* системная ошибка — `REFUNDED`;
* невозможность поставить задачу в очередь — `REFUNDED`;
* отмена до начала обработки — `REFUNDED`;
* safety rejection — поведение задаётся бизнес-настройкой;
* пользовательская ошибка — списание не выполняется.

Проверка и резервирование должны выполняться атомарно.

---

# 23. VIP-статус

## 23.1. Хранение

VIP не должен определяться специальным паролем или данными на клиенте.

Статус должен храниться в базе через:

* тариф;
* подписку;
* индивидуальное назначение администратором.

## 23.2. Срок действия

VIP может иметь:

* дату начала;
* дату окончания;
* бессрочный статус;
* статус активности.

## 23.3. Статусы подписки

```text
ACTIVE
EXPIRED
CANCELLED
PENDING
```

---

# 24. Системные уведомления

В боковой панели или верхней части приложения администратор может публиковать уведомления.

Примеры:

* технические работы;
* новая модель;
* изменение тарифов;
* временная недоступность AI;
* акция;
* ссылка на Telegram.

Уведомление может содержать:

* заголовок;
* текст;
* ссылку;
* тип;
* дату начала;
* дату окончания;
* активность.

Нельзя загружать и выводить произвольный внешний HTML без очистки.

---

# 25. Проекты пользователя

## 25.1. Проект

Каждая работа пользователя оформляется как отдельный проект.

Проект содержит:

* название;
* исходное изображение;
* визуальную разметку;
* референсы;
* текущий prompt;
* выбранную модель;
* выбранный формат;
* генерации;
* дату создания;
* дату обновления.

## 25.2. Статусы проекта

```text
DRAFT
ACTIVE
ARCHIVED
DELETED
```

## 25.3. Действия

Пользователь может:

* создать проект;
* изменить название;
* открыть проект;
* продолжить редактирование;
* создать копию;
* архивировать;
* удалить;
* восстановить, если предусмотрена корзина.

## 25.4. Удаление

По умолчанию используется soft delete.

Файлы физически удаляются позже фоновой задачей после установленного retention period.

---

# 26. История генераций

Страница:

```text
/app/history
```

## 26.1. Карточка генерации

Карточка должна показывать:

* preview результата;
* дату;
* статус;
* модель;
* формат;
* название проекта;
* количество референсов;
* короткий prompt;
* время выполнения.

## 26.2. Фильтры

* статус;
* модель;
* проект;
* период;
* наличие результата.

## 26.3. Действия

* открыть;
* скачать;
* повторить;
* создать вариацию;
* скопировать prompt;
* удалить.

## 26.4. Пагинация

Использовать cursor pagination.

Размер страницы по умолчанию:

```text
20 элементов
```

Сортировка:

```text
createdAt DESC
```

---

# 27. Сброс рабочей сессии

На странице редактора должна быть кнопка:

```text
Сбросить
```

Она должна очищать только текущее несохранённое состояние:

* выбранное исходное изображение;
* временную разметку;
* временные референсы;
* prompt;
* результат текущей несохранённой генерации.

Кнопка не должна:

* удалять аккаунт;
* удалять историю;
* удалять сохранённые проекты;
* сбрасывать тариф;
* завершать Google-сессию.

Перед очисткой необходимо показать подтверждение.

---

# 28. REST API

## 28.1. Авторизация

```http
GET /api/v1/auth/me
POST /api/v1/auth/logout
GET /api/v1/auth/callback
```

Google OAuth инициируется через Supabase SDK или серверный endpoint.

## 28.2. Профиль

```http
GET   /api/v1/profile
PATCH /api/v1/profile
```

## 28.3. Проекты

```http
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
POST   /api/v1/projects/:id/duplicate
```

## 28.4. Файлы

```http
POST   /api/v1/projects/:id/source-image
DELETE /api/v1/projects/:id/source-image

POST   /api/v1/projects/:id/visual-prompt
DELETE /api/v1/projects/:id/visual-prompt

POST   /api/v1/projects/:id/references
POST   /api/v1/projects/:id/references/from-url
PATCH  /api/v1/projects/:id/references/reorder
DELETE /api/v1/projects/:id/references/:referenceId
```

## 28.5. Генерации

```http
POST   /api/v1/generations
GET    /api/v1/generations
GET    /api/v1/generations/:id
POST   /api/v1/generations/:id/retry
POST   /api/v1/generations/:id/cancel
DELETE /api/v1/generations/:id
```

## 28.6. Файлы результата

```http
GET /api/v1/generations/:id/download
GET /api/v1/files/:id/signed-url
```

## 28.7. Конфигурация

```http
GET /api/v1/config
GET /api/v1/models
GET /api/v1/plans
GET /api/v1/usage/today
GET /api/v1/notifications
```

## 28.8. Административное API

```http
GET   /api/v1/admin/users
GET   /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id

GET   /api/v1/admin/generations
GET   /api/v1/admin/generations/:id

GET   /api/v1/admin/models
POST  /api/v1/admin/models
PATCH /api/v1/admin/models/:id

GET   /api/v1/admin/plans
POST  /api/v1/admin/plans
PATCH /api/v1/admin/plans/:id

GET   /api/v1/admin/notifications
POST  /api/v1/admin/notifications
PATCH /api/v1/admin/notifications/:id
DELETE /api/v1/admin/notifications/:id

GET   /api/v1/admin/settings
PATCH /api/v1/admin/settings
```

---

# 29. Формат REST-ответов

## 29.1. Успешный ответ

```json
{
  "data": {},
  "meta": {}
}
```

## 29.2. Ошибка

```json
{
  "error": {
    "code": "GENERATION_LIMIT_EXCEEDED",
    "message": "Дневной лимит генераций исчерпан",
    "details": null,
    "requestId": "uuid"
  }
}
```

## 29.3. Основные коды ошибок

```text
UNAUTHORIZED
FORBIDDEN
USER_BLOCKED
VALIDATION_ERROR
PROJECT_NOT_FOUND
FILE_NOT_FOUND
FILE_TOO_LARGE
INVALID_FILE_TYPE
INVALID_IMAGE
REFERENCE_LIMIT_EXCEEDED
MODEL_NOT_FOUND
MODEL_NOT_AVAILABLE
MODEL_NOT_ALLOWED
GENERATION_LIMIT_EXCEEDED
GENERATION_ALREADY_RUNNING
GENERATION_NOT_FOUND
AI_SAFETY_REJECTED
AI_TIMEOUT
AI_RATE_LIMIT
AI_INVALID_RESPONSE
AI_MODEL_UNAVAILABLE
AI_PERMISSION_DENIED
AI_BILLING_ERROR
AI_INTERNAL_ERROR
INTERNAL_SERVER_ERROR
```

---

# 30. Структура базы данных

## 30.1. Profile

```prisma
model Profile {
  id            String       @id @db.Uuid
  email         String       @unique
  displayName   String?
  firstName     String?
  lastName      String?
  avatarUrl     String?
  role          UserRole     @default(USER)
  status        UserStatus   @default(ACTIVE)
  planId        String?      @db.Uuid
  timezone      String       @default("Asia/Tashkent")
  lastLoginAt   DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?

  plan          Plan?        @relation(fields: [planId], references: [id])
  projects      Project[]
  generations   Generation[]
  usageEvents   UsageEvent[]
  subscriptions Subscription[]
}
```

`Profile.id` должен соответствовать ID пользователя в `auth.users`.

## 30.2. Plan

```prisma
model Plan {
  id                   String    @id @default(uuid()) @db.Uuid
  code                 String    @unique
  name                 String
  description          String?
  dailyGenerationLimit Int?
  maxReferenceImages   Int       @default(10)
  maxUploadSizeMb      Int       @default(15)
  maxConcurrentJobs    Int       @default(1)
  watermarkEnabled     Boolean   @default(true)
  priority             Int       @default(0)
  active               Boolean   @default(true)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  profiles             Profile[]
  subscriptions        Subscription[]
  modelAccess          PlanModel[]
}
```

`dailyGenerationLimit = null` означает отсутствие лимита.

## 30.3. Subscription

```prisma
model Subscription {
  id        String             @id @default(uuid()) @db.Uuid
  userId    String             @db.Uuid
  planId    String             @db.Uuid
  status    SubscriptionStatus
  startsAt  DateTime
  expiresAt DateTime?
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt

  user      Profile            @relation(fields: [userId], references: [id])
  plan      Plan               @relation(fields: [planId], references: [id])
}
```

## 30.4. Project

```prisma
model Project {
  id              String        @id @default(uuid()) @db.Uuid
  userId          String        @db.Uuid
  name            String
  status          ProjectStatus @default(DRAFT)
  prompt          String?
  modelId         String?       @db.Uuid
  aspectRatio     AspectRatio   @default(RATIO_16_9)
  sourceImageId   String?       @db.Uuid
  visualPromptId  String?       @db.Uuid
  canvasState     Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  user            Profile       @relation(fields: [userId], references: [id])
  sourceImage     MediaFile?    @relation("ProjectSourceImage", fields: [sourceImageId], references: [id])
  visualPrompt    MediaFile?    @relation("ProjectVisualPrompt", fields: [visualPromptId], references: [id])
  model           AiModel?      @relation(fields: [modelId], references: [id])
  references      ProjectReference[]
  generations     Generation[]
}
```

## 30.5. MediaFile

```prisma
model MediaFile {
  id          String    @id @default(uuid()) @db.Uuid
  ownerId     String    @db.Uuid
  bucket      String
  path        String
  originalName String?
  mimeType    String
  extension   String?
  sizeBytes   Int
  width       Int?
  height      Int?
  checksum    String?
  type        MediaType
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?
}
```

## 30.6. ProjectReference

```prisma
model ProjectReference {
  id        String    @id @default(uuid()) @db.Uuid
  projectId String    @db.Uuid
  fileId    String    @db.Uuid
  sourceUrl String?
  position  Int
  createdAt DateTime  @default(now())

  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  file      MediaFile @relation(fields: [fileId], references: [id])
}
```

## 30.7. AiModel

```prisma
model AiModel {
  id                    String       @id @default(uuid()) @db.Uuid
  provider              AiProvider
  code                  String       @unique
  externalModelId       String
  name                  String
  description           String?
  active                Boolean      @default(true)
  preview               Boolean      @default(false)
  timeoutSeconds        Int          @default(120)
  maxReferenceImages    Int          @default(10)
  maxInputSizeMb        Int          @default(15)
  supportsVisualPrompt  Boolean      @default(true)
  costPerGeneration     Decimal?     @db.Decimal(12, 6)
  priority              Int          @default(0)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  generations           Generation[]
  plans                  PlanModel[]
  projects               Project[]
}
```

## 30.8. PlanModel

```prisma
model PlanModel {
  planId  String  @db.Uuid
  modelId String  @db.Uuid

  plan    Plan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  model   AiModel @relation(fields: [modelId], references: [id], onDelete: Cascade)

  @@id([planId, modelId])
}
```

## 30.9. Generation

```prisma
model Generation {
  id                    String           @id @default(uuid()) @db.Uuid
  userId                String           @db.Uuid
  projectId             String           @db.Uuid
  modelId               String           @db.Uuid
  status                GenerationStatus @default(QUEUED)
  prompt                String
  finalPrompt           String?
  aspectRatio           AspectRatio
  visualPromptUsed      Boolean          @default(false)
  sourceImageId         String           @db.Uuid
  visualPromptImageId   String?          @db.Uuid
  resultOriginalId      String?          @db.Uuid
  resultUserId          String?          @db.Uuid
  errorCode             String?
  errorMessage          String?
  providerRequestId     String?
  attemptCount          Int              @default(0)
  durationMs            Int?
  estimatedCost         Decimal?         @db.Decimal(12, 6)
  queuedAt              DateTime         @default(now())
  startedAt             DateTime?
  completedAt           DateTime?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  deletedAt             DateTime?

  user                   Profile          @relation(fields: [userId], references: [id])
  project                Project          @relation(fields: [projectId], references: [id])
  model                  AiModel          @relation(fields: [modelId], references: [id])
  references             GenerationReference[]
  usageEvent             UsageEvent?
}
```

## 30.10. GenerationReference

Референсы генерации необходимо копировать в отдельную связующую таблицу, чтобы история не изменялась после редактирования проекта.

```prisma
model GenerationReference {
  generationId String    @db.Uuid
  fileId       String    @db.Uuid
  position     Int

  generation   Generation @relation(fields: [generationId], references: [id], onDelete: Cascade)
  file         MediaFile  @relation(fields: [fileId], references: [id])

  @@id([generationId, fileId])
}
```

## 30.11. UsageEvent

```prisma
model UsageEvent {
  id           String      @id @default(uuid()) @db.Uuid
  userId       String      @db.Uuid
  generationId String?     @unique @db.Uuid
  status       UsageStatus
  usageDate    DateTime
  reservedAt   DateTime    @default(now())
  consumedAt   DateTime?
  refundedAt   DateTime?
  expiresAt    DateTime?
  reason       String?

  user         Profile     @relation(fields: [userId], references: [id])
  generation   Generation? @relation(fields: [generationId], references: [id])
}
```

## 30.12. Notification

```prisma
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  title     String?
  content   String
  type      NotificationType @default(INFO)
  linkUrl   String?
  active    Boolean          @default(true)
  startsAt  DateTime?
  endsAt    DateTime?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
}
```

## 30.13. SystemSetting

```prisma
model SystemSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

## 30.14. AuditLog

```prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String?  @db.Uuid
  action     String
  entityType String?
  entityId   String?
  metadata   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
}
```

---

# 31. Supabase Storage

## 31.1. Buckets

Рекомендуемые приватные buckets:

```text
source-images
visual-prompts
reference-images
generation-originals
generation-results
branding
```

## 31.2. Доступ

Все пользовательские buckets должны быть приватными.

Доступ к файлам осуществляется:

* через Next.js REST API;
* через временный Signed URL;
* после проверки владельца файла.

## 31.3. Service Role

Supabase `service_role` key:

* используется только на сервере;
* не передаётся браузеру;
* не хранится в публичных переменных;
* не используется в Client Components.

---

# 32. Row Level Security

RLS необходимо включить для всех пользовательских таблиц в открытой схеме.

Основные правила:

* пользователь видит только свой профиль;
* пользователь видит только свои проекты;
* пользователь видит только свои генерации;
* пользователь видит только свои usage events;
* пользователь не может назначить себе роль;
* пользователь не может назначить себе тариф;
* пользователь не может изменить VIP-статус;
* администраторские операции выполняются через серверный API.

Supabase Auth ID должен сравниваться с `userId`.

Даже при использовании Prisma и серверного API RLS должна применяться как дополнительный уровень защиты.

---

# 33. Prisma ORM

Prisma используется для:

* бизнес-таблиц;
* связей;
* транзакций;
* выборок;
* пагинации;
* административных операций;
* учёта лимитов.

Для подключения использовать:

```text
DATABASE_URL — pooled runtime connection
DIRECT_URL — прямое подключение для миграций
```

Необходимо использовать singleton Prisma Client, чтобы не создавать большое количество соединений при development hot reload.

---

# 34. Безопасность

## 34.1. Обязательные требования

* все входные данные валидируются через Zod;
* каждый API endpoint проверяет сессию;
* каждый объект проверяется на принадлежность пользователю;
* административные endpoint проверяют роль;
* секреты не передаются клиенту;
* Storage buckets приватные;
* URL-загрузка защищена от SSRF;
* HTML-уведомления очищаются;
* ошибки не раскрывают stack trace;
* ведётся audit log административных действий;
* применяется rate limiting;
* проверяется MIME-тип файлов;
* используются безопасные Signed URLs;
* запрещён произвольный выбор AI-модели;
* используется Content Security Policy.

## 34.2. Rate limiting

Ограничения должны применяться к:

* созданию генерации;
* загрузке файлов;
* добавлению URL;
* получению Signed URLs;
* административным действиям.

## 34.3. Idempotency

Endpoint создания генерации должен поддерживать idempotency key.

Это предотвращает создание нескольких одинаковых задач при повторном клике или повторной отправке запроса.

---

# 35. Административная панель

## 35.1. Dashboard

Показатели:

* всего пользователей;
* новых пользователей за период;
* активных пользователей;
* VIP-пользователей;
* генераций сегодня;
* успешных генераций;
* неуспешных генераций;
* safety rejection;
* среднее время генерации;
* примерная стоимость AI;
* используемые модели.

## 35.2. Пользователи

Таблица:

* Google-аватар;
* имя;
* email;
* роль;
* тариф;
* статус;
* использовано сегодня;
* дата регистрации;
* последний вход.

Действия:

* открыть профиль;
* заблокировать;
* разблокировать;
* назначить тариф;
* назначить VIP;
* изменить срок VIP;
* изменить лимит.

## 35.3. Генерации

Администратор может видеть:

* пользователя;
* проект;
* исходное изображение;
* результат;
* prompt;
* модель;
* статус;
* ошибку;
* стоимость;
* длительность;
* количество попыток.

## 35.4. Модели

Администратор может:

* добавить модель;
* включить;
* отключить;
* изменить название;
* настроить доступ по тарифам;
* изменить лимиты;
* изменить timeout;
* изменить стоимость;
* изменить приоритет.

## 35.5. Уведомления

Администратор может:

* создать уведомление;
* отредактировать;
* включить;
* отключить;
* задать период показа;
* добавить ссылку.

## 35.6. Настройки

* дневной лимит;
* размер файлов;
* количество референсов;
* часовой пояс;
* настройки водяного знака;
* ссылка на покупку VIP;
* системный prompt;
* maintenance mode.

---

# 36. Интерфейс

## 36.1. Общие требования

* адаптивность от 320 px;
* поддержка desktop, tablet и mobile;
* понятные состояния загрузки;
* skeleton loaders;
* уведомления об ошибках;
* подтверждение опасных действий;
* доступность с клавиатуры;
* корректные focus states;
* оптимизация изображений;
* интерфейс на русском языке.

## 36.2. Основные страницы

```text
/
 /login
 /auth/callback
 /app
 /app/design
 /app/projects
 /app/projects/[id]
 /app/history
 /app/profile
 /admin
 /admin/users
 /admin/users/[id]
 /admin/generations
 /admin/models
 /admin/plans
 /admin/notifications
 /admin/settings
```

## 36.3. Sidebar

Внутри приложения Sidebar содержит:

* логотип;
* новый дизайн;
* проекты;
* история;
* информацию о тарифе;
* использованный лимит;
* системное уведомление;
* настройки;
* профиль;
* выход.

---

# 37. Логирование и мониторинг

Необходимо логировать:

* создание генерации;
* запуск worker;
* Vertex AI request;
* Vertex AI response status;
* длительность;
* retry;
* ошибку;
* сохранение результата;
* списание лимита;
* возврат лимита.

Не логировать:

* Google access token;
* service account key;
* Supabase service role key;
* полные credentials;
* бинарное содержимое изображений.

Рекомендуемые сервисы:

* Sentry;
* Vercel Logs;
* Google Cloud Logging;
* OpenTelemetry.

Каждый API-запрос должен иметь `requestId`.

---

# 38. Нефункциональные требования

## 38.1. Производительность

* обычный REST API должен отвечать до 500–1000 мс без учёта AI;
* списки должны использовать cursor pagination;
* большие изображения не передаются через JSON;
* AI-результаты не хранятся в базе как Base64;
* изображения должны кешироваться;
* Signed URLs должны иметь ограниченный срок.

## 38.2. Надёжность

* повторная обработка временных AI-ошибок;
* идемпотентные background jobs;
* защита от двойного списания лимита;
* защита от двойной генерации;
* корректное восстановление после падения worker;
* автоматический refund при технической ошибке.

## 38.3. Масштабируемость

Приложение должно позволять отдельно масштабировать:

* Next.js frontend/API;
* generation workers;
* browser scraping workers;
* image processing;
* очередь задач.

---

# 39. Переменные окружения

Примерный перечень:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

SUPABASE_SERVICE_ROLE_KEY

DATABASE_URL
DIRECT_URL

GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_LOCATION
GOOGLE_APPLICATION_CREDENTIALS_JSON

APP_URL
APP_TIMEZONE

QUEUE_API_KEY
QUEUE_SIGNING_SECRET

SENTRY_DSN
```

Секретные переменные не должны иметь префикс `NEXT_PUBLIC_`.

---

# 40. Критерии приёмки

Проект считается готовым, если выполнены следующие требования:

1. Пользователь может войти только через Google.
2. При первом входе автоматически создаётся профиль.
3. Неавторизованный пользователь не может открыть рабочую область.
4. Пользователь может загрузить фотографию комнаты.
5. Загруженный файл сохраняется в приватном Supabase Storage.
6. Пользователь может рисовать поверх фотографии.
7. Оригинал и размеченное изображение хранятся отдельно.
8. Пользователь может загрузить до разрешённого количества референсов.
9. Пользователь может удалить и изменить порядок референсов.
10. Пользователь может добавить референс по URL.
11. URL-загрузка защищена от SSRF.
12. Пользователь может написать текстовую инструкцию.
13. Пользователь может выбрать разрешённую модель.
14. Пользователь может выбрать формат изображения.
15. Backend проверяет тариф и дневной лимит.
16. Генерация создаётся через REST API.
17. Генерация выполняется сервером через Vertex AI.
18. Google credentials не передаются браузеру.
19. Пользователь видит статус генерации.
20. При успехе результат сохраняется в Storage.
21. Для обычного тарифа накладывается водяной знак.
22. Пользователь может сравнить изображения «До / После».
23. Пользователь может скачать результат.
24. Пользователь видит историю генераций.
25. Пользователь видит текущий дневной лимит.
26. При технической ошибке лимит возвращается.
27. Пользователь не может просматривать чужие проекты.
28. Пользователь не может скачивать чужие файлы.
29. Пользователь не может самостоятельно назначить себе VIP.
30. Администратор может управлять пользователями.
31. Администратор может управлять тарифами.
32. Администратор может управлять моделями.
33. Администратор может управлять уведомлениями.
34. Администратор может управлять водяным знаком.
35. Все основные операции логируются.
36. Приложение корректно работает на компьютере и мобильных устройствах.

