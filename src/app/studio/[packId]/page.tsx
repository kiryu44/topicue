import { Studio } from "@/modules/prompt-pack/ui/studio";

const StudioPage = async ({ params }: { params: Promise<{ packId: string }> }) => {
  return <Studio packId={(await params).packId} />;
};

export default StudioPage;
