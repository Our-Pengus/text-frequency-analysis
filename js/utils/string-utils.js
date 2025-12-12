/**
 * 문자열 처리 유틸리티 모음
 */

/**
 * 접미사 체크 유틸리티
 * @param {string} str - 검사할 문자열
 * @param {string} suffix - 접미사
 * @returns {boolean} true면 str이 suffix로 끝남
 */
export function endsWith(str, suffix) {
  if (str.length < suffix.length) return false;
  return str.substring(str.length - suffix.length) === suffix;
}

/**
 * 문자열 앞뒤의 구두점 제거
 * @param {string} word - 처리할 단어
 * @returns {string} 구두점이 제거된 단어
 */
export function trimPunctuation(word) {
  const punct = ".,!?;:\"'()[]{}<>";
  let start = 0;
  let end = word.length;

  while (start < word.length && punct.includes(word[start])) start++;
  while (end > start && punct.includes(word[end - 1])) end--;

  return word.substring(start, end);
}
