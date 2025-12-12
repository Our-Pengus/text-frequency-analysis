/**
 * 한국어 텍스트의 단어 빈도 분석을 수행하는 모듈
 * - 정규화, 형태소 분석, 불용어 제거 포함
 * - 순수 JS 구현 (브라우저 호환)
 */

import { normalizeWord, analyzeMorpheme } from "./utils/text-normalizer.js";
import { isValidKeyword } from "./utils/word-validators.js";

/**
 * 단어 전처리 파이프라인
 * 1. 기본 정제: 구두점 제거, 한글만 추출
 * 2. 형태소 분석: 조사 제거
 * 3. 키워드 검증: 불용어, 짧은 단어, 금지 끝말 등 제외
 *
 * @param {string} raw - 원본 단어
 * @returns {string|null} 전처리된 단어, 제외 대상이면 null
 */
function preprocessWord(raw) {
  // 1. 기본 정제 (구두점, ASCII)
  let word = normalizeWord(raw);
  if (!word) return null;

  // 2. 형태소 분석 (조사 + 어미 통합)
  word = analyzeMorpheme(word);
  if (!word) return null;

  // 3. 검증만 (불용어, 길이, 품사)
  return isValidKeyword(word) ? word : null;
}

/**
 * 입력 받은 문장을 단어로 분리하고 빈도 분석을 수행한다.
 * 1. 공백 기준 단어 분리
 * 2. 단어 전처리 (정규화, 형태소 분석, 검증)
 * 3. 단어 빈도 집계
 *
 * @param {string} text 분석할 텍스트
 * @returns {Array<{word: string, count: number}>} 단어와 빈도 객체 배열 (빈도 내림차순 정렬)
 */
export function analyzeFrequencyJS(text) {
  const freq = new Map();

  // 1. 공백으로 단어 분리
  const words = text.split(/\s+/);

  // 2. 단어 전처리
  const processedWords = words.map(preprocessWord).filter(Boolean);

  // 3. 빈도 집계 (단순하고 명확)
  for (const word of processedWords) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // 결과를 배열로 변환
  const results = [];
  for (const [word, count] of freq) {
    results.push({ word, count });
  }

  // 빈도순으로 정렬 (내림차순)
  results.sort((a, b) => b.count - a.count);

  return results;
}

// 전역 스코프에 함수 노출 (브라우저 환경)
if (typeof window !== "undefined") {
  window.analyzeFrequencyJS = analyzeFrequencyJS;
}
