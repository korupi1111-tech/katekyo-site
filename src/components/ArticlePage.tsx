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
      <div><small>SERIES　|　{seriesName}</small><h3>私が「感覚の英語」を身につけた方法</h3><p>座学だけに頼らず、映画やアニメを通じて英語に触れ続けてきた講師自身の経験を紹介します。</p></div>
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
        <button type="button" className="active"><span>SERIES</span><strong>{seriesName}</strong><small>第1回　私が「感覚の英語」を身につけた方法</small></button>
      </aside>
      <article className="articleBody">
        <header><div className="articleCategory"><BookOpen size={16} /> 講師紹介　|　英語</div><p className="articleSeriesName">SERIES　|　{seriesName}</p><h2>私が「感覚の英語」を身につけた方法</h2><p className="articleLead">英語を「勉強」としてだけでなく、日常の楽しみとして続けてきた経験について。</p><div className="articleAuthor"><span>KT</span><p><b>こうたろう先生</b><small><Clock3 size={14} /> 読了目安 5分</small></p></div></header>
        <section>
          <p>私の経歴を見ると、幼稚園から英会話スクールに通い、小学2年生から小学3年生までインターナショナルスクールに在籍し、その後は一般の学校へ進学しています。中学生で英検準1級を取得し、現在は高校3年生でTOEIC910点を取得しています。</p>
          <p>しかし、私の英語学習の特徴は、実は「勉強を続けたこと」ではありません。</p>
          <h3>楽しみの中で、英語に触れ続ける</h3>
          <p>私は小さい頃から洋アニメや海外映画を娯楽として楽しんできました。英語を勉強しなければならないものとして捉えたことはほとんどなく、純粋に面白いから見ていました。小学生の頃には字幕なしで海外映画を観られるようになっていました。</p>
          <p>また、幼稚園時代に英会話スクールへ通い、ネイティブ講師と触れ合う機会を多く持てたことも大きかったと思います。日本では日常生活の中で英語に触れる機会が限られています。そのため、幼少期から英語を聞き、英語で会話する時間を作ることは非常に重要だと感じています。</p>
          <p>よく「幼い頃から二つの言語を学ぶと日本語に悪影響が出るのではないか」と心配されることがありますが、少なくとも私は日本語に不自由を感じたことは一度もありませんでした。</p>
          <h3>英語を、英語のまま理解する感覚</h3>
          <p>私が幼少期から英語を学ぶことに大きな意味があると考える理由は、英語を日本語に変換して理解するのではなく、英語を英語として理解するための「言語回路」のようなものを作れる点にあります。これは非常に強力です。</p>
          <p>あくまで私自身の例ですが、英語の長文を読んでいるとき、日本語に一語ずつ訳している感覚はありません。文を読んだ瞬間に意味が頭に入り、日本語として表現するときには自然と適切な語順に組み替えられています。英語を読んでから日本語に変換するというより、内容そのものを直接理解している感覚に近いです。</p>
          <h3>感覚で身につける学び方の、得意と苦手</h3>
          <p>ただし、この学び方には欠点もあります。英語を感覚的に身につけると、リスニングや読解は驚くほど速く伸びます。一方で、文法を正確に説明したり、ミスなく使いこなしたりするレベルに到達するには時間がかかります。</p>
          <p>実際、私は中学2年生頃まで文法がかなり曖昧でした。whatとwhichの違いも説明できませんでしたし、感覚で使えていても理屈は全く理解していませんでした。</p>
          <p>本来であれば、中学・高校で学ぶ英文法は、その感覚的な英語力をさらに強固なものにしてくれます。直感で理解できる英語に文法という理論が加われば、より高いレベルを目指せるからです。</p>
          <h3>文法を学ばなくてよい、ということではない</h3>
          <p>しかし私は、自分の英語力に甘えてしまい、学校の英語の授業をほとんど聞きませんでした。もちろん、それを誰かに勧めるつもりはありません。</p>
          <p>学校の授業では英語の基礎から説明します。例えばSVOを学ぶ際には「I like you.」のような文から始まります。しかし、幼い頃から英語に触れてきた私にとっては、それは説明を受けるまでもなく理解できる内容でした。その結果、「なぜそうなるのか」という文法的説明を聞いても、頭に残らず流れていってしまったのです。</p>
          <p>もちろん文法は大切です。学ばなくていいと言いたいわけではありません。</p>
          <h3>英語が得意になる方法は、一つではない</h3>
          <p>ただ私は、一般的な「単語帳を覚え、文法問題を解き続けて英語を身につけた人」ではありません。むしろ、幼少期から英語に触れ続け、映画やアニメを楽しむ中で感覚的な英語力を育ててきた人間です。</p>
          <p>この記事では、「英語が得意になる方法は一つではない」ということを伝えたいと思います。私の経験が、英語学習に悩む方や、お子様の英語教育を考えている保護者の方の参考になれば幸いです。</p>
        </section>
      </article>
    </div>
  </main>;
}
