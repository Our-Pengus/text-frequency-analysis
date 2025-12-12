/**
 * 언어 감지 유틸리티
 */
// 언어 타입 구분
export const LanguageType = {
  ENGLISH: "ENGLISH",
  HANGUL: "HANGUL",
  OTHER: "OTHER",
};

// 한글 문자인지 체크 (유니코드 범위: U+AC00 ~ U+D7A3)
export function isHangulChar(char) {
  const code = char.charCodeAt(0);
  // 한글 완성형: U+AC00 (가) ~ U+D7A3 (힣)
  return code >= 0xac00 && code <= 0xd7a3;
}

// 단어의 언어 타입 판별
export function detectLanguage(word) {
  if (!word || word.length === 0) return LanguageType.OTHER;

  let hasHangul = false;
  let hasNonAscii = false;

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const code = char.charCodeAt(0);

    if (code < 128) {
      // ASCII 문자 (영어/숫자)
      // 계속 진행
    } else {
      // 비-ASCII 문자
      hasNonAscii = true;

      if (isHangulChar(char)) {
        hasHangul = true;
      }
    }
  }

  // 한글이 하나라도 있으면 한글로 판단
  if (hasHangul) return LanguageType.HANGUL;

  // ASCII만 있으면 영어
  if (!hasNonAscii) return LanguageType.ENGLISH;

  // 그 외는 기타 언어
  return LanguageType.OTHER;
}
