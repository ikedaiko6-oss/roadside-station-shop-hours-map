export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">プライバシーポリシー</h1>

      <p className="text-sm text-gray-500 mb-8">最終更新日：2026年6月2日</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. 収集する情報</h2>
        <p className="text-gray-700">
          本アプリ（道の駅お店時間マップ）は、Googleアカウントでログインした際に、
          Googleが提供する名前・メールアドレスを取得します。
          また、ユーザーが登録した道の駅内のお店の位置情報、店名、営業時間、写真、確認日を収集・保存します。
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. 情報の利用目的</h2>
        <p className="text-gray-700">
          収集した情報は、道の駅内のお店の営業時間情報の登録・表示のためのみに使用します。
          第三者への販売・提供は行いません。
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. 情報の管理</h2>
        <p className="text-gray-700">
          データはSupabase（supabase.com）のサービスを利用して安全に保管されます。
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. お問い合わせ</h2>
        <p className="text-gray-700">
          プライバシーに関するご質問は ikedaiko6@gmail.com までご連絡ください。
        </p>
      </section>
    </div>
  );
}
