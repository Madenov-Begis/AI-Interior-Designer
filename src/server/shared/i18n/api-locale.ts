import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/routing";

const supportedLocales = new Set<Locale>(["en", "ru", "uz"]);

export function resolveApiLocale(value: string | null | undefined): Locale {
  if (!value) return "en";

  const candidates = value
    .split(",")
    .map((part, index) => {
      const [tag, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((item) =>
        item.trim().toLowerCase().startsWith("q="),
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.split("=")[1] ?? "0")
        : 1;
      return {
        locale: tag.toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((item) => item.quality > 0)
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index,
    );

  for (const candidate of candidates) {
    if (supportedLocales.has(candidate.locale as Locale)) {
      return candidate.locale as Locale;
    }
  }
  return "en";
}

export function localeFromHeaders(headers: Headers): Locale {
  return resolveApiLocale(headers.get("accept-language"));
}

const en = {
  UNAUTHORIZED: "Please sign in to continue",
  FORBIDDEN: "You do not have permission to perform this action",
  RATE_LIMITED: "Too many requests. Please try again later",
  VALIDATION_ERROR: "Check the entered data",
  INTERNAL_ERROR: "The request could not be completed",
  REQUEST_FAILED: "The request failed",
  AUTH_UNAVAILABLE: "Authentication is temporarily unavailable",
  INVALID_REFRESH_TOKEN: "Your session has expired",
  REFRESH_FAILED: "Could not refresh the session",
  LOGOUT_FAILED: "Could not sign out",
  CLIENT_UPDATE_REQUIRED: "Refresh the page to continue",
  PROFILE_READ_FAILED: "Could not load the profile",
  PROFILE_UPDATE_FAILED: "Could not update the profile",
  CANVAS_ONBOARDING_READ_FAILED: "Could not load the onboarding status",
  CANVAS_ONBOARDING_UPDATE_FAILED: "Could not update the onboarding status",
  PROJECT_ENTRY_FAILED: "Could not open the project",
  PROJECT_NOT_FOUND: "Project not found",
  WORKSPACE_READ_FAILED: "Could not load the workspace",
  ROOM_CATALOG_FAILED: "Could not load the room list",
  HISTORY_READ_FAILED: "Could not load the generation history",
  GENERATION_NOT_FOUND: "Generation not found",
  GENERATION_READ_FAILED: "Could not load the generation",
  GENERATION_CREATE_FAILED: "Could not create the interior design",
  GENERATION_CANCEL_FAILED: "Could not cancel the generation",
  GENERATION_NOT_CANCELLABLE: "This generation can no longer be cancelled",
  GENERATION_NOT_RETRYABLE: "This generation cannot be retried",
  RETRY_FAILED: "Could not retry the generation",
  REFINEMENT_CREATE_FAILED: "Could not create the refinement",
  FILE_NOT_FOUND: "File not found",
  FILE_REQUIRED: "Select a file",
  FILE_TOO_LARGE: "The file is too large",
  IMAGE_TOO_LARGE: "The image is too large",
  IMAGE_EMPTY: "The file is empty",
  INVALID_UPLOAD: "Check the file format and size",
  UPLOAD_FAILED: "Could not upload the file",
  SIGNED_URL_FAILED: "Could not open the file",
  IMAGE_VALIDATION_UNAVAILABLE: "Image validation is temporarily unavailable",
  IMAGE_NOT_INTERIOR:
    "Upload a photo of a room interior. Exteriors and street scenes are not supported",
  IMAGE_FORMAT_UNSUPPORTED: "Only JPG, PNG and WEBP images are supported",
  IMAGE_MIME_MISMATCH: "The file type does not match its contents",
  IMAGE_DIMENSIONS_UNKNOWN: "Could not determine the image dimensions",
  IMAGE_TOO_SMALL: "The image is too small",
  IMAGE_DIMENSIONS_TOO_LARGE: "The image dimensions are too large",
  IMAGE_CORRUPTED: "The image is corrupted or cannot be decoded",
  IMAGE_NOT_FOUND: "No suitable image was found",
  SOURCE_ALREADY_EXISTS: "A room photo has already been uploaded",
  SOURCE_DOWNLOAD_FAILED: "Could not open the source image",
  SOURCE_DIMENSIONS_MISSING: "Could not determine the source image dimensions",
  SOURCE_SIZE_MISMATCH: "The source image has changed. Reload the editor",
  REFERENCE_REQUIRED: "Add at least one reference",
  REFERENCE_NOT_FOUND: "Reference not found",
  REFERENCE_LIMIT_EXCEEDED: "The reference limit has been reached",
  REFERENCE_UPLOAD_FAILED: "Could not upload the reference",
  REFERENCE_DELETE_FAILED: "Could not delete the reference",
  REFERENCE_CLEAR_FAILED: "Could not clear the references",
  REFERENCE_REORDER_FAILED: "Could not change the reference order",
  URL_IMPORT_FAILED: "Could not import the image from the link",
  INVALID_URL: "The link is invalid",
  UNSAFE_URL: "Internal addresses are not allowed",
  REMOTE_FILE_TOO_LARGE: "The remote file is too large",
  REMOTE_EMPTY_RESPONSE: "The remote server returned an empty response",
  REMOTE_TIMEOUT: "The remote server did not respond in time",
  REMOTE_HTTP_ERROR: "The remote server returned an error",
  REMOTE_FETCH_FAILED: "Could not load the link",
  TOO_MANY_REDIRECTS: "The link has too many redirects",
  INVALID_REDIRECT: "The remote server returned an invalid redirect",
  OVERLAY_REQUIRED: "Add markings to the image",
  OVERLAY_TOO_LARGE: "The marking image is too large",
  VISUAL_PROMPT_SAVE_FAILED: "Could not save the markings",
  VISUAL_PROMPT_DELETE_FAILED: "Could not delete the markings",
  VISUAL_PROMPT_NOT_FOUND: "The markings are unavailable",
  INVALID_OVERLAY: "The markings must be a valid PNG image",
  OVERLAY_SIZE_MISMATCH: "The marking size does not match the editor state",
  CANVAS_STATE_REQUIRED: "The editor state is missing",
  INVALID_CANVAS_STATE: "The editor state is corrupted",
  DOWNLOAD_FAILED: "Could not download the result",
  INSUFFICIENT_CREDITS: "Not enough credits",
  INVALID_CREDIT_AMOUNT: "The credit amount is invalid",
  IDEMPOTENCY_CONFLICT:
    "This request has already been processed with different data",
  PROFILE_NOT_FOUND: "Profile unavailable",
  USER_BLOCKED: "The account is blocked",
  PROJECT_NOT_READY: "Upload a room photo first",
  MODEL_NOT_ALLOWED: "The selected format is not supported",
  GENERATION_ALREADY_RUNNING: "Wait for the current generation to finish",
  ROOM_NOT_AVAILABLE: "The selected room is no longer available",
  PAYMENTS_DISABLED: "Payments are temporarily unavailable",
  CREDIT_PACKAGE_NOT_FOUND: "Credit package not found",
  PAYMENT_ORDER_NOT_FOUND: "Payment order not found",
  PAYMENT_ORDER_EXPIRED: "The payment time has expired",
  PAYMENT_ORDER_NOT_PAID: "The payment has not been completed",
  PAYMENT_EVENT_MISMATCH: "Could not confirm the payment result",
  INVALID_PAYMENT_TRANSITION:
    "The payment status has already changed. Refresh the page",
  MOCK_PAYMENTS_NOT_SAFE: "Test payment is unavailable in this mode",
  AI_GENERATION_FAILED:
    "The interior could not be generated. Your credits were returned",
  AI_PROVIDER_NOT_CONFIGURED: "Image generation is temporarily unavailable",
  PROVIDER_TIMEOUT: "Generation took too long. Your credits were returned",
  GENERATION_EXPIRED:
    "Generation did not finish in time. Your credits were returned",
  WORKER_INTERRUPTED:
    "Generation was interrupted. Your credits were returned; you can try again",
  UPLOAD_TOO_LARGE: "The upload is too large",
  UPLOAD_NOT_FOUND: "The upload was not found",
  UPLOAD_NOT_READY: "The upload has not completed",
  UPLOAD_SIZE_MISMATCH: "The uploaded file size does not match",
  UPLOAD_TYPE_MISMATCH: "The uploaded file type does not match",
  UPLOAD_TARGET_NOT_FOUND: "The upload target was not found",
  UPLOAD_INIT_FAILED: "Could not prepare the upload",
} as const;

const uz: Record<keyof typeof en, string> = {
  UNAUTHORIZED: "Davom etish uchun tizimga kiring",
  FORBIDDEN: "Bu amalni bajarishga ruxsatingiz yo‘q",
  RATE_LIMITED: "So‘rovlar juda ko‘p. Keyinroq qayta urinib ko‘ring",
  VALIDATION_ERROR: "Kiritilgan ma’lumotlarni tekshiring",
  INTERNAL_ERROR: "So‘rovni bajarib bo‘lmadi",
  REQUEST_FAILED: "So‘rov bajarilmadi",
  AUTH_UNAVAILABLE: "Kirish vaqtincha ishlamayapti",
  INVALID_REFRESH_TOKEN: "Sessiya muddati tugadi",
  REFRESH_FAILED: "Sessiyani yangilab bo‘lmadi",
  LOGOUT_FAILED: "Tizimdan chiqib bo‘lmadi",
  CLIENT_UPDATE_REQUIRED: "Davom etish uchun sahifani yangilang",
  PROFILE_READ_FAILED: "Profilni yuklab bo‘lmadi",
  PROFILE_UPDATE_FAILED: "Profilni yangilab bo‘lmadi",
  CANVAS_ONBOARDING_READ_FAILED: "Tanishuv holatini yuklab bo‘lmadi",
  CANVAS_ONBOARDING_UPDATE_FAILED: "Tanishuv holatini yangilab bo‘lmadi",
  PROJECT_ENTRY_FAILED: "Loyihani ochib bo‘lmadi",
  PROJECT_NOT_FOUND: "Loyiha topilmadi",
  WORKSPACE_READ_FAILED: "Ish maydonini yuklab bo‘lmadi",
  ROOM_CATALOG_FAILED: "Xonalar ro‘yxatini yuklab bo‘lmadi",
  HISTORY_READ_FAILED: "Generatsiyalar tarixini yuklab bo‘lmadi",
  GENERATION_NOT_FOUND: "Generatsiya topilmadi",
  GENERATION_READ_FAILED: "Generatsiyani yuklab bo‘lmadi",
  GENERATION_CREATE_FAILED: "Interyer dizaynini yaratib bo‘lmadi",
  GENERATION_CANCEL_FAILED: "Generatsiyani bekor qilib bo‘lmadi",
  GENERATION_NOT_CANCELLABLE: "Bu generatsiyani endi bekor qilib bo‘lmaydi",
  GENERATION_NOT_RETRYABLE: "Bu generatsiyani qayta ishga tushirib bo‘lmaydi",
  RETRY_FAILED: "Generatsiyani qayta ishga tushirib bo‘lmadi",
  REFINEMENT_CREATE_FAILED: "Tahrirlangan variantni yaratib bo‘lmadi",
  FILE_NOT_FOUND: "Fayl topilmadi",
  FILE_REQUIRED: "Faylni tanlang",
  FILE_TOO_LARGE: "Fayl juda katta",
  IMAGE_TOO_LARGE: "Rasm juda katta",
  IMAGE_EMPTY: "Fayl bo‘sh",
  INVALID_UPLOAD: "Fayl formati va hajmini tekshiring",
  UPLOAD_FAILED: "Faylni yuklab bo‘lmadi",
  SIGNED_URL_FAILED: "Faylni ochib bo‘lmadi",
  IMAGE_VALIDATION_UNAVAILABLE: "Rasmni tekshirish vaqtincha ishlamayapti",
  IMAGE_NOT_INTERIOR:
    "Xona interyeri suratini yuklang. Eksteryer va ko‘cha tasvirlari qo‘llab-quvvatlanmaydi",
  IMAGE_FORMAT_UNSUPPORTED:
    "Faqat JPG, PNG va WEBP rasmlari qo‘llab-quvvatlanadi",
  IMAGE_MIME_MISMATCH: "Fayl turi uning mazmuniga mos emas",
  IMAGE_DIMENSIONS_UNKNOWN: "Rasm o‘lchamlarini aniqlab bo‘lmadi",
  IMAGE_TOO_SMALL: "Rasm juda kichik",
  IMAGE_DIMENSIONS_TOO_LARGE: "Rasm o‘lchamlari juda katta",
  IMAGE_CORRUPTED: "Rasm buzilgan yoki uni ochib bo‘lmaydi",
  IMAGE_NOT_FOUND: "Mos rasm topilmadi",
  SOURCE_ALREADY_EXISTS: "Xona surati allaqachon yuklangan",
  SOURCE_DOWNLOAD_FAILED: "Asosiy rasmni ochib bo‘lmadi",
  SOURCE_DIMENSIONS_MISSING: "Asosiy rasm o‘lchamlarini aniqlab bo‘lmadi",
  SOURCE_SIZE_MISMATCH: "Asosiy rasm o‘zgargan. Muharrirni qayta yuklang",
  REFERENCE_REQUIRED: "Kamida bitta namuna qo‘shing",
  REFERENCE_NOT_FOUND: "Namuna topilmadi",
  REFERENCE_LIMIT_EXCEEDED: "Namunalar soni chegarasiga yetildi",
  REFERENCE_UPLOAD_FAILED: "Namunani yuklab bo‘lmadi",
  REFERENCE_DELETE_FAILED: "Namunani o‘chirib bo‘lmadi",
  REFERENCE_CLEAR_FAILED: "Namunalarni tozalab bo‘lmadi",
  REFERENCE_REORDER_FAILED: "Namunalar tartibini o‘zgartirib bo‘lmadi",
  URL_IMPORT_FAILED: "Havoladan rasmni import qilib bo‘lmadi",
  INVALID_URL: "Havola noto‘g‘ri",
  UNSAFE_URL: "Ichki manzillarga ruxsat berilmaydi",
  REMOTE_FILE_TOO_LARGE: "Masofadagi fayl juda katta",
  REMOTE_EMPTY_RESPONSE: "Masofadagi server bo‘sh javob qaytardi",
  REMOTE_TIMEOUT: "Masofadagi server vaqtida javob bermadi",
  REMOTE_HTTP_ERROR: "Masofadagi server xato qaytardi",
  REMOTE_FETCH_FAILED: "Havolani yuklab bo‘lmadi",
  TOO_MANY_REDIRECTS: "Havolada yo‘naltirishlar juda ko‘p",
  INVALID_REDIRECT: "Masofadagi server noto‘g‘ri yo‘naltirish qaytardi",
  OVERLAY_REQUIRED: "Rasmga belgilash kiriting",
  OVERLAY_TOO_LARGE: "Belgilash rasmi juda katta",
  VISUAL_PROMPT_SAVE_FAILED: "Belgilashni saqlab bo‘lmadi",
  VISUAL_PROMPT_DELETE_FAILED: "Belgilashni o‘chirib bo‘lmadi",
  VISUAL_PROMPT_NOT_FOUND: "Belgilash mavjud emas",
  INVALID_OVERLAY: "Belgilash to‘g‘ri PNG rasm bo‘lishi kerak",
  OVERLAY_SIZE_MISMATCH: "Belgilash o‘lchami muharrir holatiga mos emas",
  CANVAS_STATE_REQUIRED: "Muharrir holati mavjud emas",
  INVALID_CANVAS_STATE: "Muharrir holati buzilgan",
  DOWNLOAD_FAILED: "Natijani yuklab bo‘lmadi",
  INSUFFICIENT_CREDITS: "Kreditlar yetarli emas",
  INVALID_CREDIT_AMOUNT: "Kredit miqdori noto‘g‘ri",
  IDEMPOTENCY_CONFLICT: "Bu so‘rov boshqa ma’lumotlar bilan avval bajarilgan",
  PROFILE_NOT_FOUND: "Profil mavjud emas",
  USER_BLOCKED: "Akkaunt bloklangan",
  PROJECT_NOT_READY: "Avval xona suratini yuklang",
  MODEL_NOT_ALLOWED: "Tanlangan format qo‘llab-quvvatlanmaydi",
  GENERATION_ALREADY_RUNNING: "Joriy generatsiya tugashini kuting",
  ROOM_NOT_AVAILABLE: "Tanlangan xona endi mavjud emas",
  PAYMENTS_DISABLED: "To‘lovlar vaqtincha ishlamayapti",
  CREDIT_PACKAGE_NOT_FOUND: "Kredit paketi topilmadi",
  PAYMENT_ORDER_NOT_FOUND: "To‘lov buyurtmasi topilmadi",
  PAYMENT_ORDER_EXPIRED: "To‘lov vaqti tugadi",
  PAYMENT_ORDER_NOT_PAID: "To‘lov yakunlanmagan",
  PAYMENT_EVENT_MISMATCH: "To‘lov natijasini tasdiqlab bo‘lmadi",
  INVALID_PAYMENT_TRANSITION: "To‘lov holati o‘zgargan. Sahifani yangilang",
  MOCK_PAYMENTS_NOT_SAFE: "Bu rejimda test to‘lovi mavjud emas",
  AI_GENERATION_FAILED:
    "Interyerni yaratib bo‘lmadi. Kreditlaringiz qaytarildi",
  AI_PROVIDER_NOT_CONFIGURED: "Rasm yaratish vaqtincha ishlamayapti",
  PROVIDER_TIMEOUT:
    "Generatsiya juda uzoq davom etdi. Kreditlaringiz qaytarildi",
  GENERATION_EXPIRED:
    "Generatsiya vaqtida yakunlanmadi. Kreditlaringiz qaytarildi",
  WORKER_INTERRUPTED:
    "Generatsiya to‘xtab qoldi. Kreditlaringiz qaytarildi; qayta urinishingiz mumkin",
  UPLOAD_TOO_LARGE: "Yuklanayotgan fayl juda katta",
  UPLOAD_NOT_FOUND: "Yuklama topilmadi",
  UPLOAD_NOT_READY: "Yuklash hali tugamagan",
  UPLOAD_SIZE_MISMATCH: "Yuklangan fayl hajmi mos emas",
  UPLOAD_TYPE_MISMATCH: "Yuklangan fayl turi mos emas",
  UPLOAD_TARGET_NOT_FOUND: "Yuklash manzili topilmadi",
  UPLOAD_INIT_FAILED: "Yuklashni tayyorlab bo‘lmadi",
};

const catalogs = { en, uz } as const;

export function localizeApiMessage(
  locale: Locale,
  code: string | null | undefined,
  russianFallback: string,
) {
  if (locale === "ru") return russianFallback;
  const messages = catalogs[locale];
  const key =
    code && code in messages ? (code as keyof typeof en) : "REQUEST_FAILED";
  return createTranslator({ locale, messages })(key);
}

export function localizeGenerationMessage(
  locale: Locale,
  code: string | null,
  storedMessage: string | null,
) {
  if (!storedMessage) return null;
  return localizeApiMessage(locale, code, storedMessage);
}
