import type { LandingDictionary } from "../dictionary";

const dictionary = {
  locale: "uz",
  localeName: "O‘zbekcha",
  seo: {
    title: "Surat bo‘yicha AI interyer dizayni — Ruvie",
    description:
      "Xona suratini yuklang va devorlar, derazalar, proporsiyalar hamda rakursni saqlagan holda bir necha daqiqada realistik AI interyer dizaynini yarating.",
    openGraphTitle: "Ta’mirdan oldin yangi interyeringizni ko‘ring",
    openGraphDescription:
      "Ruvie yordamida bitta suratdan realistik xona dizaynlarini yarating va takomillashtiring.",
  },
  skipLink: "Asosiy tarkibga o‘tish",
  header: {
    logoLabel: "Ruvie — bosh sahifa",
    navigationLabel: "Asosiy navigatsiya",
    examples: "Namunalar",
    process: "Qanday ishlaydi",
    pricing: "Kreditlar",
    login: "Kirish",
    languageLabel: "Til",
  },
  hero: {
    eyebrow: "Suratingizdan AI interyer dizayni",
    title: ["Yangi interyerni", "ta’mirdan", "oldin ko‘ring"],
    description:
      "Xonangiz suratini yuklang. Ruvie devorlar, derazalar va rakursni saqlab, bir necha daqiqada realistik yangi dizayn yaratadi.",
    primaryCta: "Suratni bepul yuklash",
    examplesCta: "Namunalarni ko‘rish",
    freeCredits:
      "Boshlash uchun 10 kredit — 2 ta dizayn uchun yetadi · karta kerak emas",
    highlights: [
      "Fayllar maxfiy saqlanadi",
      "6 ta interyer uslubi",
      "Oddiy matn bilan o‘zgartirish",
    ],
    resultAlt: "Ruvie’da yaratilgan AI interyer dizayni",
    resultLabel: "Dizayn · Japandi",
    sourceAlt: "Xonaning boshlang‘ich surati",
    sourceLabel: "Boshlang‘ich xona",
    geometryTitle: "Reja saqlanadi",
    geometryCopy: "Interyer o‘zgaradi, xona arxitekturasi esa joyida qoladi.",
  },
  examples: {
    heading: ["Interyeringiz qanday", "ko‘rinishini ko‘ring"],
    description:
      "Bitta suratni bir nechta realistik yo‘nalishga aylantiring. Mebel xarid qilish yoki ta’mirni boshlashdan oldin ularni solishtiring.",
    aiLabel: "AI dizayn",
    items: [
      {
        title: "Mehmonxona",
        style: "Japandi",
        alt: "Japandi uslubidagi mehmonxona AI dizayni",
      },
      {
        title: "Oshxona",
        style: "Zamonaviy",
        alt: "Zamonaviy oshxona AI dizayni",
      },
      {
        title: "Yotoqxona",
        style: "Minimalizm",
        alt: "Minimalistik yotoqxona AI dizayni",
      },
      {
        title: "Ish xonasi",
        style: "Loft",
        alt: "Loft uslubidagi ish xonasi AI dizayni",
      },
      {
        title: "Ovqatlanish xonasi",
        style: "Neoklassika",
        alt: "Neoklassik ovqatlanish xonasi AI dizayni",
      },
    ],
  },
  process: {
    eyebrow: "Suratdan g‘oyagacha",
    heading: "Boshlash oson. Davom ettirish ham.",
    description:
      "Ruvie sizni uzun sozlash jarayonidan o‘tkazmaydi. Barcha ish xonangiz atrofida quriladi va bitta loyihada saqlanadi.",
    imageAlt: "AI yordamida yaratilgan zamonaviy interyer vizualizatsiyasi",
    steps: [
      {
        title: "Suratni yuklang",
        copy: "Smartfonda olingan oddiy va tiniq xona surati yetarli.",
      },
      {
        title: "Istagingizni yozing",
        copy: "Uslubni tanlang va nimani saqlash yoki almashtirish kerakligini yozing.",
      },
      {
        title: "Natijani rivojlantiring",
        copy: "Variantlarni solishtiring va yoqqan dizayndan davom eting.",
      },
    ],
  },
  stories: {
    eyebrow: "Uy va ish uchun",
    heading: "Sizga mos, agar…",
    items: [
      {
        title: "Ta’mirni rejalashtirsangiz",
        text: "Material buyurtma qilishdan oldin uslub, rang va mebelni sinab ko‘ring.",
      },
      {
        title: "Dizayner bo‘lib ishlasangiz",
        text: "Birinchi uchrashuv uchun bir nechta yo‘nalish tayyorlang va tanlangan g‘oyani rivojlantiring.",
      },
      {
        title: "Uyni sotuvga tayyorlasangiz",
        text: "Bo‘sh yoki tugallanmagan xonaning imkoniyatlarini haqiqiy sahnalashtirishsiz ko‘rsating.",
      },
      {
        title: "Bitta xonani yangilasangiz",
        text: "Bir nechta g‘oyani solishtirib, uyingizga mos yo‘nalishni toping.",
      },
    ],
  },
  workflow: {
    eyebrow: "Bitta ish maydoni",
    heading: "Yaxshi variantni yo‘qotmang",
    description:
      "Boshlang‘ich surat, barcha variantlar va keyingi o‘zgartirishlar bitta kanvasda qoladi. G‘oyalarni solishtiring va istalgan natijadan davom eting.",
    items: [
      "Surat darhol kanvasda paydo bo‘ladi",
      "Barcha dizaynlar yonma-yon qoladi",
      "O‘zgartirishlarni oddiy tilda yozing",
      "Butun tarix ko‘z oldingizda qoladi",
    ],
    cta: "Suratni bepul yuklash",
    credits: "10 kredit",
    sourceAlt: "Ruvie kanvasidagi boshlang‘ich xona surati",
    sourceLabel: "Boshlang‘ich surat",
    resultAlt: "Ruvie kanvasidagi yaratilgan interyer dizayni",
    resultLabel: "Dizayn 01",
  },
  pricing: {
    heading: "Kredit paketlari",
    description:
      "Ruvie’da yangi dizayn va o‘zgartirishlar kreditlar orqali yaratiladi",
    loading: "Kredit paketlari yuklanmoqda…",
    error: "Kredit paketlarini yuklab bo‘lmadi",
    retry: "Qayta urinish",
    popular: "Eng ommabop",
    packageTitle: "{credits} kreditlik paket",
    packageDescription: "AI dizayn va o‘zgartirishlar uchun",
    credits: "kredit",
    enoughFor: "Yetadi:",
    generations: "ta dizayn yoki o‘zgartirish",
    neverExpire: "Kreditlarning muddati tugamaydi",
    buy: "Sotib olish",
    starterTitle: "Yangi foydalanuvchilarga 10 kredit",
    starterCopy: "2 ta dizayn uchun yetadi. Bank kartasi kerak emas.",
    freeCta: "Bepul sinab ko‘rish",
  },
  faq: {
    eyebrow: "Savol-javob",
    heading: "Ko‘p so‘raladigan savollar",
    description:
      "Birinchi AI xona dizaynini yaratishdan oldin bilishingiz kerak bo‘lgan ma’lumotlar.",
    items: [
      {
        question: "Qanday suratlar eng yaxshi natija beradi?",
        answer:
          "Xonani tekis rakursda, kunduzgi yorug‘likda va xiralashtirmasdan suratga oling. 15 MB gacha JPG, PNG va WEBP fayllari qo‘llab-quvvatlanadi.",
      },
      {
        question: "Ruvie derazalar va xona geometriyasini saqlaydimi?",
        answer:
          "Ha. Asosiy ko‘rsatma modeldan rakurs, proporsiyalar va arxitektura elementlarini saqlashni talab qiladi.",
      },
      {
        question: "Yoqtirgan dizaynimdan davom eta olamanmi?",
        answer:
          "Ha. Kanvasdagi natijani tanlang, takomillashtirishni oching va keyingi o‘zgarishni yozing.",
      },
      {
        question: "Bitta generatsiya qancha turadi?",
        answer:
          "Bitta generatsiya 4 kredit turadi. Joriy balans va aniq narx ishga tushirishdan oldin ko‘rsatiladi.",
      },
      {
        question: "Texnik xato yuz bersa nima bo‘ladi?",
        answer:
          "Zaxiralangan kreditlar avtomatik ravishda balansga qaytariladi, shuning uchun muvaffaqiyatsiz texnik urinish uchun haq olinmaydi.",
      },
      {
        question: "Dizaynerlik ko‘nikmalari kerakmi?",
        answer:
          "Yo‘q. Suratni yuklang, uslubni tanlang va istagingizni oddiy tilda yozing.",
      },
      {
        question: "Darhol to‘lashim kerakmi?",
        answer:
          "Yo‘q. Ro‘yxatdan o‘tgach, ikkita generatsiya uchun yetadigan 10 kredit olasiz. Boshlash uchun bank kartasi kerak emas.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Bitta xonadan boshlang",
    heading: "Xonangiz suratidan boshlang",
    description:
      "Dastlabki ikkita dizaynni bepul yarating va natijani ko‘rgach davom etish haqida qaror qiling.",
    cta: "Suratni bepul yuklash",
    imageAlt: "AI yordamida yaratilgan yorug‘ neoklassik interyer",
  },
  footer: {
    logoLabel: "Ruvie — bosh sahifa",
    navigationLabel: "Pastki havolalar",
    product: "Mahsulot",
    process: "Qanday ishlaydi",
    examples: "Namunalar",
    login: "Kirish",
    documents: "Hujjatlar",
    privacy: "Maxfiylik siyosati",
    offer: "Ommaviy oferta",
    tagline: "Bitta vizual maydonda AI interyer dizayni",
  },
} satisfies LandingDictionary;

export default dictionary;
