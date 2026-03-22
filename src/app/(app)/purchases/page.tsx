import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import { EmptyStatePage } from "@/components/empty-state-page";

export default function PurchasesPage() {
  return (
    <EmptyStatePage
      icon={ShoppingCartOutlined}
      heading="Purchase planning will appear here"
      description="Evaluate whether you can afford a purchase, when you can afford it, and what trade-offs it creates."
    />
  );
}
