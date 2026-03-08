export const resources = {
  en: {
    translation: {
      title: "Fytrak",
      subtitle: "MVP foundation is ready",
      roleTrainee: "Trainee",
      roleCoach: "Coach",
      language: "Language",
      rtl: "RTL",
    },
  },
  fr: {
    translation: {
      title: "Fytrak",
      subtitle: "Base MVP prête",
      roleTrainee: "Athlète",
      roleCoach: "Coach",
      language: "Langue",
      rtl: "RTL",
    },
  },
  ar: {
    translation: {
      title: "فاي تراك",
      subtitle: "أساس النسخة الأولى جاهز",
      roleTrainee: "متدرّب",
      roleCoach: "مدرّب",
      language: "اللغة",
      rtl: "من اليمين لليسار",
    },
  },
} as const;

export type AppLanguage = keyof typeof resources;
