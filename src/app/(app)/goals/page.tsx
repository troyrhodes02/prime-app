import FlagOutlined from "@mui/icons-material/FlagOutlined";
import { EmptyStatePage } from "@/components/empty-state-page";

export default function GoalsPage() {
  return (
    <EmptyStatePage
      icon={FlagOutlined}
      heading="Your goals will appear here"
      description="Set savings targets, track your progress, and get clear timelines for when you can reach your financial goals."
    />
  );
}
