import type { Locale } from "@/i18n/routing";

export type LocalizedName = {
  name: string;
  nameEn: string | null;
  nameUz: string | null;
};

export function localizedName(item: LocalizedName, locale: Locale) {
  if (locale === "ru") return item.name;
  if (locale === "uz")
    return item.nameUz?.trim() || item.nameEn?.trim() || item.name;
  return item.nameEn?.trim() || item.name;
}

export function localizedOptionalText(
  item: {
    description: string | null;
    descriptionEn: string | null;
    descriptionUz: string | null;
  },
  locale: Locale,
) {
  if (locale === "ru") return item.description;
  if (locale === "uz")
    return (
      item.descriptionUz?.trim() ||
      item.descriptionEn?.trim() ||
      item.description
    );
  return item.descriptionEn?.trim() || item.description;
}
