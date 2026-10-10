export const subjectOptions = [
  "小学生英語", "中学英語", "高校英語", "英語",
  "中学数学", "高校数学", "数学",
  "中学国語", "現代文", "古文・漢文", "国語",
  "高校理科", "理科", "地理", "社会", "情報", "小論文", "その他",
];

export const englishTopics = ["長文読解", "英作文・ライティング", "英文法", "リスニング", "スピーキング", "英検対策", "TOEIC対策", "TOEFL対策", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
export const mathTopics = ["計算", "文章題", "図形", "証明", "関数", "確率", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
export const japaneseTopics = ["長文読解", "古文・漢文", "小論文", "記述対策", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
export const scienceTopics = ["計算", "図解", "実験・考察", "公式の使い分け", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
export const socialTopics = ["資料読解", "地図・統計", "用語整理", "因果関係の整理", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
export const generalTopics = ["学習計画", "進路相談", "面接練習", "志望理由書", "定期テスト対策", "その他"];
export const topicOptions = [...new Set([...englishTopics, ...mathTopics, ...japaneseTopics, ...scienceTopics, ...socialTopics, ...generalTopics])];

export const englishLevels = ["基礎から", "学校の授業補習", "定期テスト", "高校受験", "大学受験", "難関大学受験", "英検5級", "英検4級", "英検3級", "英検準2級", "英検2級", "英検準1級", "英検1級"];
export const studyLevels = ["基礎から", "学校の授業補習", "定期テスト", "高校受験", "共通テスト", "大学受験", "難関大学受験"];
export const levelOptions = [...new Set([...englishLevels, ...studyLevels])];

export const qualificationLabelOptions = ["英語資格", "英検", "TOEIC", "TOEFL", "IELTS", "数学資格", "数学検定", "国語資格", "漢字検定", "日本語検定", "理科資格", "社会資格", "教職・教育", "教員免許", "指導経験", "その他"];
export const qualificationOptions = ["英検5級", "英検4級", "英検3級", "英検準2級", "英検2級", "英検準1級", "英検1級", "TOEIC L&R", "TOEFL iBT", "IELTS", "数学検定", "漢字検定", "日本語検定", "教員免許", "教職課程履修中", "中学受験経験", "指導経験"];
export const lessonTypeOptions = ["単発授業", "長期指導", "学習相談", "進路相談", "質問対応", "添削", "面接練習"];
export const contactMethodOptions = ["オンライン通話", "対面", "メッセージ", "メール", "添削のみ"];
export const teachingTypeOptions = ["感覚型", "理論型", "暗記型", "演習型", "その他"];
export const lessonStyleOptions = ["質問重視", "演習重視", "精読重視", "添削重視", "アウトプット重視", "インプット重視", "対話重視", "生徒に合わせて変更"];

const englishSubjects = ["小学生英語", "中学英語", "高校英語", "英語"];
const mathSubjects = ["中学数学", "高校数学", "数学"];
const japaneseSubjects = ["中学国語", "現代文", "古文・漢文", "国語", "小論文"];
const scienceSubjects = ["高校理科", "理科"];
const socialSubjects = ["地理", "社会"];

export function topicOptionsForSubject(subject: string) {
  if (englishSubjects.includes(subject)) return englishTopics;
  if (mathSubjects.includes(subject)) return mathTopics;
  if (japaneseSubjects.includes(subject)) return japaneseTopics;
  if (scienceSubjects.includes(subject)) return scienceTopics;
  if (socialSubjects.includes(subject)) return socialTopics;
  return generalTopics;
}

export function levelOptionsForSubject(subject: string) {
  return englishSubjects.includes(subject) ? englishLevels : studyLevels;
}

export function subjectMatches(selectedSubject: string, teacherSubjects: string[]) {
  const family = englishSubjects.includes(selectedSubject) ? englishSubjects
    : mathSubjects.includes(selectedSubject) ? mathSubjects
      : japaneseSubjects.includes(selectedSubject) ? japaneseSubjects
        : scienceSubjects.includes(selectedSubject) ? scienceSubjects
          : socialSubjects.includes(selectedSubject) ? socialSubjects
            : [selectedSubject];
  return teacherSubjects.some(subject => family.includes(subject));
}
