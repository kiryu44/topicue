import { Suspense } from "react";

import { CreatePack } from "@/modules/prompt-pack/ui/create-pack";

const CreatePage = () => {
  return (
    <Suspense fallback={<main className="shell">準備中…</main>}>
      <CreatePack />
    </Suspense>
  );
};

export default CreatePage;
