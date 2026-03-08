import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { resources, AppLanguage } from "./resources";

const supportedLanguages: AppLanguage[] = ["en", "fr", "ar"];

const getInitialLanguage = (): AppLanguage => {
  const deviceLanguage = getLocales()[0]?.languageCode?.toLowerCase();

  if (deviceLanguage && supportedLanguages.includes(deviceLanguage as AppLanguage)) {
    return deviceLanguage as AppLanguage;
  }

  return "en";
};

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
