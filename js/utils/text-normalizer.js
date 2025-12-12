/**
 * 한국어 형태소 분석기 (정규화에 초점)
 */

import { LanguageType, detectLanguage } from "./language-detector.js";
import { JOSA_ENDINGS, NG_ENDINGS } from "../constants/korean-rules.js";
import { trimPunctuation, endsWith } from "./string-utils.js";

/**
 * 단어 정규화 (한글만 추출)
 * - 구두점 제거
 * - 한글이 아니면 빈 문자열 반환
 * - ASCII 문자 제거
 *
 * @param {string} word - 정규화할 단어
 * @returns {string} 한글만 추출된 단어, 한글이 없으면 빈 문자열
 */
export function normalizeWord(word) {
  // 구두점 제거
  const trimmed = trimPunctuation(word);
  if (!trimmed) return "";

  // 한글이 아니면 빈 문자열 반환
  if (detectLanguage(trimmed) !== LanguageType.HANGUL) {
    return "";
  }

  // 한글만 추출 (ASCII 문자 제거)
  let result = "";
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const code = char.charCodeAt(0);

    // ASCII가 아니면 (한글 등 멀티바이트 문자) 포함
    if (code >= 128) {
      result += char;
    }
  }

  return result;
}

/**
 * 조사 제거 (한국어 전용)
 * - 단어 뒤에 붙은 조사를 제거
 * - 여러 개 겹쳐 붙은 경우도 처리
 *
 * @param {string} word - 조사를 제거할 단어
 * @returns {string} 조사가 제거된 단어
 */
export function stripJosa(word) {
  // 한글이 아니면 조사 제거하지 않음
  if (detectLanguage(word) !== LanguageType.HANGUL) {
    return word;
  }

  let base = word;

  // 조사 1회만 제거 
  for (const suf of JOSA_ENDINGS) {
    if (base.length > suf.length && endsWith(base, suf)) {
      if (suf.length === 1 && base.length < 4) continue;

      base = base.substring(0, base.length - suf.length);
      break;
    }
  }

  return base;
}

/**
 * 형태소 분석 - 조사 제거 및 동사/형용사 패턴 검증
 * - 1단계: 조사 제거 (은/는/이/가 등)
 * - 2단계: 동사/형용사/부사 패턴 체크 (제외 대상)
 *
 * @param {string} word - 분석할 단어
 * @returns {string} 형태소 분석된 단어 (명사 체언만 추출), 제외 대상이면 빈 문자열
 */
export function analyzeMorpheme(word) {
  // 한글이 아니면 처리하지 않음
  if (detectLanguage(word) !== LanguageType.HANGUL) {
    return word;
  }

  // 1단계: 조사 제거
  let base = stripJosa(word);
  if (!base) return "";

  // 2단계: 동사/형용사/부사 패턴 체크 (제외 대상)
  // NG_ENDINGS 체크
  for (const suf of NG_ENDINGS) {
    if (endsWith(base, suf)) return "";
  }

  // "…한"으로 끝나는 관형사형
  if (base.length >= 2 && endsWith(base, "한")) return "";

  // '다'로 끝나는 단어 (서술어)
  if (base.length >= 2 && endsWith(base, "다")) return "";

  return base;
}
