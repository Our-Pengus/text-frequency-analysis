import { LanguageType, detectLanguage } from "./language-detector.js";
import {
  STOPWORDS,
  NG_ENDINGS,
  FUNCTION_NOUNS,
  STRONG_NOUN_SUFFIX,
} from "../constants/korean-rules.js";
import { endsWith } from "./string-utils.js";

/**
 * 한글 단어인지 검증
 * @param {string} word
 * @returns {boolean}
 */
export function isKorean(word) {
  if (!word || word.length === 0) return false;
  return detectLanguage(word) === LanguageType.HANGUL;
}

/**
 * 불용어인지 검증 (그리고, 하지만 등)
 * @param {string} word
 * @returns {boolean}
 */
export function isStopword(word) {
  return STOPWORDS.has(word);
}

/**
 * 최소 길이 요구사항을 충족하는지 검증
 * @param {string} word
 * @param {number} minLength - 최소 길이 (기본값: 2)
 * @returns {boolean}
 */
export function checkMinLength(word, minLength = 2) {
  return word.length >= minLength;
}

/**
 * 동사/형용사/부사 패턴인지 검증 (제외 대상)
 * @param {string} word
 * @returns {boolean} true면 동사/형용사/부사 패턴 (제외 대상)
 */
export function isVerbOrAdjectivePattern(word) {
  // 금지 끝말 체크
  for (const suf of NG_ENDINGS) {
    if (endsWith(word, suf)) return true;
  }

  // "…한"으로 끝나는 관형사형
  if (word.length >= 2 && endsWith(word, "한")) return true;

  // '다'로 끝나는 단어 (서술어)
  if (word.length >= 2 && endsWith(word, "다")) return true;

  return false;
}

/**
 * 의미가 약한 기능 명사인지 검증 (제외 대상)
 * @param {string} word
 * @returns {boolean} true면 기능 명사 (제외 대상)
 */
export function isFunctionNoun(word) {
  return FUNCTION_NOUNS.has(word);
}

/**
 * 강한 명사 패턴인지 검증 (포함 대상)
 * @param {string} word
 * @returns {boolean} true면 명사 가능성 매우 높음
 */
export function isStrongNounPattern(word) {
  for (const suf of STRONG_NOUN_SUFFIX) {
    if (endsWith(word, suf)) return true;
  }
  return false;
}

/**
 * 단어가 분석할 가치가 있는 키워드인지 검증
 * (전제: 이미 normalizeWord와 analyzeMorpheme를 거친 한글 명사)
 *
 * @param {string} word - 검증할 단어
 * @returns {boolean} true면 키워드로 사용 가능
 */
export function isValidKeyword(word) {
  // 1. 불용어 체크
  if (isStopword(word)) return false;

  // 2. 최소 길이 체크
  if (!checkMinLength(word)) return false;

  // 3. 기능 명사 제외
  if (isFunctionNoun(word)) return false;

  // 4. 강한 명사 패턴이면 즉시 통과
  if (isStrongNounPattern(word)) return true;

  // 5. 그 외의 경우는 명사로 간주
  return true;
}
