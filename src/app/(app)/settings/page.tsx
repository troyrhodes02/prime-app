import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { EmptyStatePage } from "@/components/empty-state-page";

export default function SettingsPage() {
  return (
    <EmptyStatePage
      icon={SettingsOutlined}
      heading="Settings"
      description="Account preferences, connected accounts, and notification settings will be managed here."
    />
  );
}
