export const OBS_RECOMMENDED_WIDTH = 1920;
export const OBS_RECOMMENDED_HEIGHT = 1080;

export const OBS_SETUP_STEPS = [
  {
    title: "ブラウザソースを追加",
    detail: "OBSのソース欄にある＋から「ブラウザ」を追加します。",
  },
  {
    title: "ローカルファイルを有効化",
    detail: "プロパティで「ローカルファイル」をONにします。",
  },
  {
    title: "生成したHTMLを選択",
    detail: "ダウンロードした prompt-dice-obs.html を指定します。",
  },
  {
    title: "表示サイズを設定",
    detail: `${OBS_RECOMMENDED_WIDTH} × ${OBS_RECOMMENDED_HEIGHT}を基準に、配信画面へ合わせます。`,
  },
  {
    title: "対話を開く",
    detail: "追加したソースを右クリックし、「対話」を選択します。",
  },
  {
    title: "ダイスを操作",
    detail: "Studioで許可したクリックまたはSpace・Enterで振ります。",
  },
] as const;

export const OBS_SHORTCUTS = [
  { operation: "サイコロを振る", key: "Space / Enter", note: "キーボード操作を許可した場合" },
  { operation: "サイコロを振る", key: "クリック", note: "画面クリックを許可した場合" },
  { operation: "履歴を開閉", key: "H", note: "履歴件数と書き出し" },
  { operation: "履歴リセット確認", key: "R", note: "確認後だけ削除" },
  { operation: "Panel・Dialogを閉じる", key: "Esc", note: "Resetを取り消す" },
] as const;
