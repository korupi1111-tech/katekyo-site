export const subjectOptions = [
  "小学校全科目", "小学生英語", "小学校算数", "小学校国語", "小学校理科", "小学校社会",
  "中学英語", "高校英語", "英語", "英語資格",
  "中学数学", "高校数学",
  "中学国語", "現代文", "古文・漢文",
  "中学理科", "高校理科", "物理", "化学", "生物", "地学",
  "地理", "日本史", "世界史", "政治・経済", "倫理", "公民", "情報", "小論文", "資格取得・検定", "その他",
];

// 検索画面だけは、利用者が選びやすい大分類に絞る。
// 講師プロフィールで入力・保存する上記の細かなラベルは変更しない。
export const directorySearchSubjectOptions = ["小学校全科目", "英語", "数学", "国語", "物理", "化学", "生物", "地学", "地理", "日本史", "世界史", "政治・経済", "倫理", "情報", "小論文", "資格取得・検定", "その他"];

const elementaryEnglishTopics = ["授業復習", "英語に親しむ", "リスニング", "スピーキング", "定期テスト対策", "その他"];
const middleEnglishTopics = ["授業復習", "定期テスト対策", "英文法", "長文読解", "英作文・ライティング", "高校受験", "その他"];
const highSchoolEnglishTopics = ["授業復習", "定期テスト対策", "長文読解", "英作文・ライティング", "共通テスト対策", "大学受験", "その他"];
const englishCertificationTopics = ["英検対策", "TOEIC対策", "TOEFL対策", "IELTS対策", "その他"];
const mathTopics = ["授業復習", "計算", "文章題", "図形", "証明", "関数", "確率", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const japaneseTopics = ["授業復習", "長文読解", "古文・漢文", "小論文", "記述対策", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const scienceTopics = ["授業復習", "計算", "図解", "実験・考察", "公式の使い分け", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const socialTopics = ["授業復習", "資料読解", "地図・統計", "用語整理", "因果関係の整理", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const elementaryTopics = ["授業復習", "基礎固め", "中学受験", "学習習慣づくり", "その他"];
const informationTopics = ["共通テスト対策", "その他"];
const generalTopics = ["学習計画", "進路相談", "面接練習", "志望理由書", "定期テスト対策", "その他"];
export const topicOptions = [...new Set([...elementaryEnglishTopics, ...middleEnglishTopics, ...highSchoolEnglishTopics, ...englishCertificationTopics, ...mathTopics, ...japaneseTopics, ...scienceTopics, ...socialTopics, ...elementaryTopics, ...informationTopics, ...generalTopics])];

const englishGoals = ["授業復習", "定期テスト", "高校受験", "共通テスト", "大学受験", "その他"];
const englishCertificationGoals = ["英検", "TOEIC", "TOEFL", "IELTS", "その他"];
const studyGoals = ["基礎固め", "授業復習", "定期テスト", "中学受験", "高校受験", "共通テスト", "大学受験", "その他"];
const informationGoals = ["共通テスト", "その他"];
export const levelOptions = [...new Set([...englishGoals, ...englishCertificationGoals, ...studyGoals])];

export const qualificationLabelOptions = ["英語資格", "英検", "TOEIC", "TOEFL", "IELTS", "数学資格", "数学検定", "国語資格", "漢字検定", "日本語検定", "理科資格", "社会資格", "教職・教育", "教員免許", "指導経験", "その他"];
export const qualificationOptions = ["英検5級", "英検4級", "英検3級", "英検準2級", "英検2級", "英検準1級", "英検1級", "TOEIC L&R", "TOEFL iBT", "IELTS", "数学検定", "漢字検定", "日本語検定", "教員免許", "教職課程履修中", "中学受験経験", "指導経験"];
export const lessonTypeOptions = ["単発授業", "長期指導", "学習相談", "進路相談", "質問対応", "添削", "面接練習"];
export const contactMethodOptions = ["オンライン通話", "対面", "メール", "添削のみ"];
export const lessonStyleOptions = ["質問重視", "演習重視", "精読重視", "添削重視", "アウトプット重視", "インプット重視", "対話重視", "生徒に合わせて変更"];

export function normalizeCombinedContactMethod(value: string) {
  return value.replace(/メッセージ・メール|メッセージ|メール/g, "メール");
}

const elementarySubjects = ["小学校全科目", "小学生英語", "小学校算数", "小学校国語", "小学校理科", "小学校社会"];
const elementaryEnglishSubjects = ["小学生英語"];
const middleEnglishSubjects = ["中学英語"];
const highSchoolEnglishSubjects = ["高校英語"];
const generalEnglishSubjects = ["英語"];
const englishCertificationSubjects = ["英語資格"];
const mathSubjects = ["中学数学", "高校数学"];
const japaneseSubjects = ["中学国語", "現代文", "古文・漢文", "小論文"];
const scienceSubjects = ["中学理科", "高校理科", "物理", "化学", "生物", "地学"];
const socialSubjects = ["小学校社会", "地理", "日本史", "世界史", "政治・経済", "倫理", "公民"];

export function topicOptionsForSubject(subject: string) {
  if (elementaryEnglishSubjects.includes(subject)) return elementaryEnglishTopics;
  if (middleEnglishSubjects.includes(subject)) return middleEnglishTopics;
  if (highSchoolEnglishSubjects.includes(subject)) return highSchoolEnglishTopics;
  if (generalEnglishSubjects.includes(subject)) return highSchoolEnglishTopics;
  if (englishCertificationSubjects.includes(subject)) return englishCertificationTopics;
  if (mathSubjects.includes(subject)) return mathTopics;
  if (japaneseSubjects.includes(subject)) return japaneseTopics;
  if (scienceSubjects.includes(subject)) return scienceTopics;
  if (socialSubjects.includes(subject)) return socialTopics;
  if (elementarySubjects.includes(subject)) return elementaryTopics;
  if (subject === "情報") return informationTopics;
  return generalTopics;
}

export function levelOptionsForSubject(subject: string) {
  if (englishCertificationSubjects.includes(subject)) return englishCertificationGoals;
  if (subject === "情報") return informationGoals;
  if ([...elementaryEnglishSubjects, ...middleEnglishSubjects, ...highSchoolEnglishSubjects, ...generalEnglishSubjects].includes(subject)) return englishGoals;
  return studyGoals;
}

export function subjectMatches(selectedSubject: string, teacherSubjects: string[]) {
  if (selectedSubject === "小学校全科目") return teacherSubjects.some(subject => elementarySubjects.includes(subject));
  if (elementarySubjects.includes(selectedSubject)) return teacherSubjects.includes(selectedSubject) || teacherSubjects.includes("小学校全科目");
  if (selectedSubject === "英語") return teacherSubjects.some(subject => [...elementaryEnglishSubjects, ...middleEnglishSubjects, ...highSchoolEnglishSubjects, ...generalEnglishSubjects].includes(subject));
  if ([...elementaryEnglishSubjects, ...middleEnglishSubjects, ...highSchoolEnglishSubjects].includes(selectedSubject)) return teacherSubjects.includes(selectedSubject) || teacherSubjects.includes("英語");
  return teacherSubjects.includes(selectedSubject);
}

/** 検索用の大分類と、講師プロフィールに保存された細分類を対応させる。 */
export function directorySearchSubjectMatches(selectedSubject: string, teacherSubjects: string[]) {
  if (!selectedSubject) return true;
  if (selectedSubject === "小学校全科目") return teacherSubjects.some(subject => elementarySubjects.includes(subject));
  if (selectedSubject === "英語") return teacherSubjects.some(subject => [...elementaryEnglishSubjects, ...middleEnglishSubjects, ...highSchoolEnglishSubjects, ...generalEnglishSubjects, ...englishCertificationSubjects].includes(subject));
  if (selectedSubject === "数学") return teacherSubjects.some(subject => mathSubjects.includes(subject) || subject === "数学");
  if (selectedSubject === "国語") return teacherSubjects.some(subject => japaneseSubjects.includes(subject) || subject === "国語");
  if (selectedSubject === "資格取得・検定") return teacherSubjects.some(subject => subject === "資格取得・検定" || subject === "英語資格");
  return teacherSubjects.includes(selectedSubject);
}
