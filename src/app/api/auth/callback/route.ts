import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrProvisionUser } from "@/services/provisioning";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const source = searchParams.get("source");
  const next = searchParams.get("next");

  const supabase = await createClient();

  if (source === "otp") {
    // OTP verification sets the session directly on the client.
    // Session cookies are forwarded via the browser request.
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/signup?error=auth_failed`,
      );
    }
  } else {
    return NextResponse.redirect(
      `${origin}/signup?error=missing_code`,
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
      return NextResponse.redirect(`${origin}/welcome?new=true`);
    }

    const redirectTo = next || "/dashboard";
    return NextResponse.redirect(`${origin}${redirectTo}`);
  } catch (error) {
    console.error("[auth/callback] Provisioning failed:", error);
    return NextResponse.redirect(
      `${origin}/signup?error=provisioning_failed`,
    );
  }
}
