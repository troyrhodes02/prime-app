import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { plaidClient } from "@/lib/plaid";
import { Products, CountryCode } from "plaid";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const params: Parameters<typeof plaidClient.linkTokenCreate>[0] = {
      user: { client_user_id: user.id },
      client_name: "P.R.I.M.E.",
      products: (process.env.PLAID_PRODUCTS || "transactions")
        .split(",")
        .map((p) => p.trim() as Products),
      country_codes: (process.env.PLAID_COUNTRY_CODES || "US")
        .split(",")
        .map((c) => c.trim() as CountryCode),
      language: "en",
    };

    if (process.env.PLAID_REDIRECT_URI) {
      params.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    const response = await plaidClient.linkTokenCreate(params);

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error("[plaid/create-link-token] Plaid API error:", (error as Error).message);
    return NextResponse.json(
      { error: "plaid_unavailable", message: "Could not connect to Plaid" },
      { status: 502 },
    );
  }
}
