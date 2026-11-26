import "server-only";
import { cookies } from "next/headers";
import { DICT, type Lang, type DictKey } from "./i18n-dict";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "si" || v === "ta" ? v : "en";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: (key: DictKey): string => DICT[lang][key] ?? DICT.en[key] ?? key };
}
