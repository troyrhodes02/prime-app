"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { EmailForm } from "@/components/auth/email-form";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);

  return (
    <AuthCard>
      <h1 className="text-center text-2xl font-semibold text-gray-900">
        Get started
      </h1>
      <p className="mt-1 text-center text-sm text-gray-500">
        Securely access your financial workspace
      </p>

      <EmailForm onLoadingChange={setLoading} />

      <AuthDivider />

      <GoogleSignInButton disabled={loading} />

      <p className="mt-6 text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
