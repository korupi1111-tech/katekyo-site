import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import "../articles.css";

type ArticleTeaserProps = { onNavigate: (page: "articles") => void };
const seriesName = "関係代名詞が何かもわからない私が準1級を取れた理由";

export function ArticleTeaser({ onNavigate }: ArticleTeaserProps) {
  return <section className="articleTeaser section">
    <div className="articleSectionHead">
      <div><span>TEACHER JOURNAL</span><h2>講師コラム</h2></div>
      <button type="button" onClick={() => onNavigate("articles")}>記事一覧を見る <ArrowRight size={17} /></button>
    </div>
    <button type="button" className="articleTeaserCard" onClick={() => onNavigate("articles")}>
      <div className="articleTeaserMark"><BookOpen /></div>
      <div><small>SERIES　|　{seriesName}</small><h3>私が英語を身につけた方法</h3><p>座学だけに頼らず、映画やアニメを通じて英語に触れ続けてきた講師自身の経験を紹介します。</p></div>
      <span>読む <ArrowRight size={18} /></span>
    </button>
  </section>;
}

export function ArticlePage() {
  return <main className="articlePage withTopbar">
    <header className="articleHero"><span>TEACHER JOURNAL</span><h1>講師コラム</h1><p>講師の学び方や指導への考え方を、本人の言葉で紹介します。</p></header>
    <div className="articleLayout">
      <aside className="articleIndex" aria-label="記事一覧">
        <div><small>ARTICLES</small><b>記事一覧</b></div>
        <button type="button" className="active"><span>SERIES</span><strong>{seriesName}</strong><small>第1回　私が英語を身につけた方法</small></button>
      </aside>
      <article className="articleBody">
        <header><div className="articleCategory"><BookOpen size={16} /> 講師紹介　|　英語</div><p className="articleSeriesName">SERIES　|　{seriesName}</p><h2>私が英語を身につけた方法</h2><p className="articleLead">英語を「勉強」としてだけでなく、日常の楽しみとして続けてきた経験について。</p><div className="articleAuthor"><span>KT</span><p><b>こうたろう先生</b><small><Clock3 size={14} /> 読了目安 4分</small></p></div></header>
        <section>
          <p>現在高校3年生の私は、英語を「勉強して身につけた」というより、幼い頃から英語に触れ続ける中で自然と身につけてきました。</p>
          <p>幼稚園の頃から英会話スクールに通い、家庭では洋アニメや海外映画を日常的に楽しんでいました。特に映画鑑賞が好きで、小学生の頃には字幕なしで海外映画を観られるようになっていました。</p>
          <h3>英語で学び、英語で生活した経験</h3>
          <p>小学2年生から小学3年生まではインターナショナルスクールに通い、英語で授業を受け、英語で生活する環境を経験しました。この頃に英検2級を取得しています。</p>
          <p>その後は一般の学校へ進学しましたが、英検2級を取得して以降、単語帳や文法問題集に取り組むような座学はほとんど行わず、英語学習からは離れていました。</p>
          <h3>「勉強」ではなく、好きなものから続ける</h3>
          <p>一方で、娯楽として洋アニメや海外映画を観る習慣だけは続けていました。英語を勉強としてではなく趣味の一部として触れ続けていたことが、結果的にリスニング力や語彙力の維持・向上につながったと感じています。</p>
          <p>その後、中学生で英検準1級を取得。現在は高校3年生で、TOEICでは特別な試験対策を行わず910点を取得しました。</p>
          <h3>英語力を伸ばす道は、一つではない</h3>
          <p>私自身の経験から、英語力を伸ばす方法は一つではないと考えています。もちろん座学は大切ですが、「英語を楽しむこと」も同じくらい重要です。</p>
          <p>アニメや映画など、自分が好きなコンテンツを活用しながら、無理なく英語に触れる方法をお伝えしていきたいと思っています。</p>
        </section>
      </article>
    </div>
  </main>;
}
