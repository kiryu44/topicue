import {
  createConfigFromTemplate,
  type BrowserTemplate,
} from "@/modules/prompt-pack/infrastructure/browser-templates";
import { SampleDice } from "@/modules/prompt-pack/ui/sample-dice";

import templateData from "../../../public/data/templates.json";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サンプルダイス",
  description: "深夜雑談用のサンプルトークダイスを、登録なしで試せます。",
};

const SamplePage = () => {
  const template = templateData.templates.find((candidate) => candidate.id === "late-night-ja");
  if (template === undefined) throw new Error("サンプル設定が見つかりません。");
  return <SampleDice config={createConfigFromTemplate(template satisfies BrowserTemplate)} />;
};

export default SamplePage;
