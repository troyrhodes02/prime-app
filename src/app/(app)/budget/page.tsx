import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import { EmptyStatePage } from "@/components/empty-state-page";

export default function BudgetPage() {
  return (
    <EmptyStatePage
      icon={AccountBalanceWalletOutlined}
      heading="Your budget will appear here"
      description="Once your accounts are connected, P.R.I.M.E. will categorize your spending and help you understand where your money goes."
    />
  );
}
