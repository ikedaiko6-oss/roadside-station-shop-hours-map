"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LOGIN_FAILED_MESSAGE = "ログインに失敗しました。もう一度お試しください。";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error")
      ? LOGIN_FAILED_MESSAGE
      : null;
  });

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    const { createClient, isSupabaseConfigured } = await import("@/lib/supabase/client");
    if (!isSupabaseConfigured()) {
      setErrorMessage("Supabase環境変数が未設定です。");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const redirectTo = `${location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      setErrorMessage("Googleログインを開始できませんでした。");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">駅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">道の駅お店時間マップ</h1>
        <p className="text-gray-500 text-sm mb-8">
          ログインしてお店の営業時間を投稿しよう
        </p>
        {errorMessage && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Googleへ移動中..." : "Googleでログイン"}
        </button>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition"
        >
          地図を見るだけ
        </button>
      </div>
    </div>
  );
}
