import "../styles/site-owner-thoughts.css";

type PageSetter = (page: string) => void;

type SiteOwnerThoughtsPageProps = {
  setPage?: PageSetter;
};

export function SiteOwnerThoughtsPage({
  setPage,
}: SiteOwnerThoughtsPageProps) {
  return (
    <main className="owner-thoughts-page">
      <section className="owner-thoughts-hero">
        <div className="owner-thoughts-art" aria-hidden="true" />
        <div className="owner-thoughts-overlay" aria-hidden="true" />

        <div className="owner-thoughts-content">
          <p className="owner-thoughts-kicker">
            SITE OWNER&apos;S THOUGHTS
          </p>

          <h1>
            大学名は分かった。
            <br />
            <span>では、何を教えられるのか。</span>
          </h1>

          <div className="owner-thoughts-copy">
            <p>
              対応科目が多いからといって、本当にすべてしっかり教えられるのか。
              <br />
              「寄り添う」「丁寧に教える」と書いてあるが、実際にはどんな授業をするのか。
            </p>

            <p>
              既存のプロフィールを読んでも、講師の本当の違いが見えませんでした。
            </p>

            <p className="owner-thoughts-emphasis">
              だから、得意だけでなく不得意も、指導方式も、
              プロフィールと実際の授業が一致していたかを表示するサイトを作りました。
            </p>

            <p>
              講師を大きな肩書で選ぶのではなく、必要な能力で選べるようにする。
              <br />
              それが、このサイトを作った理由です。
            </p>
          </div>

          <div className="owner-thoughts-actions">
            <button
              type="button"
              onClick={() => setPage?.("search")}
            >
              先生を探す
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="owner-thoughts-secondary"
              onClick={() => setPage?.("home")}
            >
              トップへ戻る
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
