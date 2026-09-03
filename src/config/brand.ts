export const brand = {
  productName: "Topicue",
  displayName:
    process.env["APP_DISPLAY_NAME"] ??
    process.env["NEXT_PUBLIC_APP_DISPLAY_NAME"] ??
    "トークセッション・ダイス",
  headline: "6面に、無限の話題を。",
  headlineLines: ["6面に、", "無限の話題を。"],
  description:
    "お題を重複なく抽選し、視聴者には見やすい結果カード、配信者には編集用の補助情報を提供します。",
  heroDieLabels: ["自己紹介", "フリー", "配信", "思い出", "好きなもの", "これから"],
} as const;
