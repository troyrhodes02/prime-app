import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrProvisionUser } from "@/services/provisioning";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/signup?error=missing_code`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/signup?error=auth_failed`,
    );
  }

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.redirect(
      `${origin}/signup?error=auth_failed`,
    );
  }

  try {
    const { isNew } = await getOrProvisionUser(supabaseUser);

    if (isNew) {
      return NextResponse.redirect(`${origin}/welcome`);
    }

    const redirectTo = next || "/dashboard";
    return NextResponse.redirect(`${origin}${redirectTo}`);
  } catch {
    return NextResponse.redirect(
      `${origin}/signup?error=provisioning_failed`,
    );
  }
}
