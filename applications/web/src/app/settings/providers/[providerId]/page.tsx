import { ProviderDetail } from "@/components/settings/provider-detail";

interface ProviderDetailPageProps {
  params: Promise<{ providerId: string }>;
}

export default async function ProviderDetailPage({
  params,
}: ProviderDetailPageProps) {
  const { providerId } = await params;
  return <ProviderDetail providerId={providerId} />;
}
