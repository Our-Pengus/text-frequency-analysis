# 한국어 텍스트 빈도 분석기

## 📋 프로젝트 개요

**한국어 전용** 텍스트 빈도 분석기로, 한국어 텍스트에서 단어의 출현 빈도를 분석하여 가장 자주 사용된 단어를 파악할 수 있는 웹 애플리케이션입니다.

### 주요 특징

- ✅ **한국어 전용 분석**: 영어, 중국어, 일본어 등 기타 언어 자동 제외
- ✅ **조사 자동 제거**: 은, 는, 이, 가, 을, 를 등 조사 자동 제거
- ✅ **불용어 필터링**: 접속어, 지시어 등 의미 없는 단어 제거
- ✅ **품사 필터링**: 동사/형용사/부사 자동 제거 (명사 중심 분석)
- ✅ **WebAssembly 기반**: 대용량 텍스트도 빠르게 처리

---

## 🏗️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: C++17 (WebAssembly)
- **빌드 도구**: Emscripten
- **3D 시각화**: Three.js

---

## 🎯 핵심 기능

### 1. 정확한 한글 감지

UTF-8 바이트 패턴으로 한글 범위(U+AC00 ~ U+D7A3)를 정확히 감지하여 중국어, 일본어 등과 구분합니다.

### 2. 한국어 특화 전처리

- 조사 제거 (은, 는, 이, 가, 을, 를 등)
- 불용어 필터링 (그리고, 하지만 등)
- 동사/형용사/부사 제거
- 기능 명사 제거 (것, 수, 때 등)

### 3. 고성능 처리

- WebAssembly로 네이티브 수준의 성능
- 해시 테이블 기반 O(1) 조회
- 대용량 텍스트 처리 가능

---

## 📐 아키텍처

```
┌─────────────────┐
│   index.html    │  ← 사용자 인터페이스
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│ WASM  │ │   JS    │  ← 분석 엔진
│ (C++) │ │ (JS)    │
└───────┘ └─────────┘
```

### 처리 흐름

1. **텍스트 입력** → 사용자가 텍스트 입력
2. **단어 분리** → 공백/구두점 기준 분리
3. **언어 감지** → 한글만 필터링
4. **정규화** → 구두점 제거, 한글만 추출
5. **조사 제거** → 한국어 조사 제거
6. **키워드 필터링** → 불용어, 동사/형용사 제거
7. **빈도 계산** → 해시 테이블로 카운트
8. **정렬 및 출력** → 빈도순 정렬 후 표시

### 주요 파일 설명

- **`wasm/text_frequency.cpp`**: C++로 작성된 핵심 분석 엔진
  - 한글 감지, 조사 제거, 키워드 필터링 등 모든 로직 포함
- **`js/text_frequency_js.js`**: JavaScript로 구현된 동일한 로직
  - WASM 없이도 동작하는 순수 JavaScript 버전
- **`js/text_frequency_wasm.js`**: Emscripten으로 생성된 WASM 바인딩
  - C++ 함수를 JavaScript에서 호출할 수 있게 해주는 인터페이스
- **`index.html`**: 웹 애플리케이션 UI
  - 텍스트 입력, 분석 실행, 결과 표시
  - Three.js를 이용한 3D 시각화 포함

---

## 💻 핵심 코드

### 1. 한글 감지 (C++)

```cpp
// UTF-8 바이트 패턴으로 한글 범위 정확히 감지
// 한글 완성형: U+AC00 (가) ~ U+D7A3 (힣)
// UTF-8 인코딩: 0xEA 0xB0 0x80 ~ 0xED 0x9E 0xA3
bool isHangulUTF8Byte(const string& s, size_t pos) {
    if (pos + 2 >= s.size()) return false;

    unsigned char b1 = static_cast<unsigned char>(s[pos]);
    unsigned char b2 = static_cast<unsigned char>(s[pos + 1]);
    unsigned char b3 = static_cast<unsigned char>(s[pos + 2]);

    // UTF-8 3바이트 문자 체크
    if ((b1 & 0xF0) != 0xE0) return false;
    if ((b2 & 0xC0) != 0x80) return false;
    if ((b3 & 0xC0) != 0x80) return false;

    // 한글 범위 체크
    if (b1 == 0xEA) {
        return b2 >= 0xB0;  // 0xEA 0xB0 0x80 ~ 0xEA 0xBF 0xBF
    } else if (b1 == 0xEB || b1 == 0xEC) {
        return true;  // 0xEB 0x80 0x80 ~ 0xEC 0xBF 0xBF
    } else if (b1 == 0xED) {
        if (b2 < 0x9E) return true;
        if (b2 == 0x9E) return b3 <= 0xA3;  // 0xED 0x9E 0xA3까지
        return false;
    }

    return false;
}
```

**핵심 포인트**: 단순히 `c >= 128`로 체크하면 중국어, 일본어도 포함되므로, UTF-8 바이트 패턴으로 정확히 한글만 감지합니다.

---

### 2. 조사 제거 (C++)

```cpp
string stripJosa(const string& w) {
    if (detectLanguage(w) != LanguageType::HANGUL) return w;

    string base = w;

    static const vector<string> JOSA = {
        "에게서는","에게서","께서는","으로써는","으로는","부터는","까지는",
        "에게는","에게도","에서는","에서의","으로써","으로도","로는","로도",
        "부터도","까지도","께서",
        "와는","와도","과는","과도","의는","의가","에는","에도","에만",
        "을은","를은","이는","이가","가는",
        "들의","들은","들이",
        "에게","에서","으로","부터","까지","라도","조차","마저","마다",
        "에","의","께","과","와","을","를","은","는","이","가","도","만","들","뿐"
    };

    for (const auto& suf : JOSA) {
        if (base.size() <= suf.size()) continue;
        if (!endsWith(base, suf)) continue;
        if (suf.size() == 3) {
            if (base.size() < 9) continue;
        }

        base = base.substr(0, base.size() - suf.size());
        break;
    }

    return base;
}
```

**예시**: "정책이" → "정책", "사회에서" → "사회"

---

### 3. 빈도 분석 메인 함수 (C++)

```cpp
vector<FrequencyResult> analyzeFrequency(const string& text) {
    unordered_map<string, int> freq;  // 해시 테이블로 O(1) 조회

    istringstream iss(text);
    string raw;

    while (iss >> raw) {
        string norm = normalizeWord(raw);  // 정규화
        if (norm.empty()) continue;

        norm = stripJosa(norm);  // 조사 제거
        if (norm.empty()) continue;

        if (!isKeyword(norm)) continue;  // 키워드 필터링

        freq[norm]++;  // 빈도 카운트
    }

    // 결과를 벡터로 변환
    vector<FrequencyResult> results;
    for (auto& p : freq) {
        results.push_back({p.first, p.second});
    }

    // 빈도순으로 정렬 (내림차순)
    sort(results.begin(), results.end(),
         [](const FrequencyResult& a, const FrequencyResult& b) {
             return a.count > b.count;
         });

    return results;
}
```

**핵심 포인트**: `unordered_map`을 사용하여 평균 O(1) 시간 복잡도로 빈도 계산

---

### 4. JavaScript 버전 (모듈화된 구조)

JavaScript 버전은 **ES6 모듈**로 분리되어 유지보수와 테스트가 용이합니다.

#### 파일 구조

```
js/
├── text_frequency_js.js       # 메인 분석 로직 (진입점)
├── utils/
│   ├── text-normalizer.js     # 정규화 및 형태소 분석
│   ├── word-validators.js     # 단어 검증
│   ├── language-detector.js   # 언어 감지
│   └── string-utils.js        # 문자열 유틸리티
└── constants/
    └── korean-rules.js        # 조사, 불용어, 품사 규칙
```

#### 실행 흐름에 따른 코드 예시

**Step 1) 메인 진입점** - `text_frequency_js.js`

사용자 텍스트를 받아 빈도 분석을 수행하는 메인 함수입니다.

```javascript
import { normalizeWord, analyzeMorpheme } from "./utils/text-normalizer.js";
import { isValidKeyword } from "./utils/word-validators.js";

/**
 * 빈도 분석 메인 함수
 * @param {string} text - 분석할 텍스트
 * @returns {Array<{word: string, count: number}>} 빈도순 정렬된 결과
 */
export function analyzeFrequencyJS(text) {
  const freq = new Map();

  // 1. 공백으로 단어 분리
  const words = text.split(/\s+/);

  // 2. 각 단어를 전처리
  const processedWords = words.map(preprocessWord).filter(Boolean);

  // 3. 빈도 계산
  for (const word of processedWords) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // 4. 결과를 배열로 변환 및 빈도순 정렬
  const results = Array.from(freq, ([word, count]) => ({ word, count }));
  results.sort((a, b) => b.count - a.count);

  return results;
}

/**
 * 단어 전처리
 * 원본 단어 → 정규화 → 형태소 분석 → 검증
 */
function preprocessWord(raw) {
  // 1. 기본 정제: 구두점 제거, 한글만 추출
  let word = normalizeWord(raw);
  if (!word) return null;

  // 2. 형태소 분석: 조사 제거 + 동사/형용사 패턴 제외
  word = analyzeMorpheme(word);
  if (!word) return null;

  // 3. 키워드 검증: 불용어, 길이, 기능명사 체크
  return isValidKeyword(word) ? word : null;
}
```

**예시 실행**:

```javascript
const text = "정책이 중요하다. 사회에서는 정책을 통해 변화를 만든다.";
const result = analyzeFrequencyJS(text);
// 결과: [{ word: "정책", count: 2 }, { word: "사회", count: 1 }, ...]
```

---

**Step 2) 정규화 단계** - `utils/text-normalizer.js`

`preprocessWord`에서 첫 번째로 호출되는 `normalizeWord` 함수입니다.

```javascript
import { LanguageType, detectLanguage } from "./language-detector.js";
import { trimPunctuation } from "./string-utils.js";

/**
 * 단어 정규화: 구두점 제거 + 한글만 추출
 * "정책이!" → "정책이"
 */
export function normalizeWord(word) {
  // 1. 앞뒤 구두점 제거
  const trimmed = trimPunctuation(word); // "정책이!" → "정책이"
  if (!trimmed) return "";

  // 2. 언어 감지: 한글이 아니면 제외
  // 만약 한글이 섞여있으면 통과
  if (detectLanguage(trimmed) !== LanguageType.HANGUL) {
    return ""; // "Hello", "你好" 등은 빈 문자열 반환
  }

  // 3. 한글만 추출 (ASCII 제거)
  let result = "";
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code >= 128) {
      // 비-ASCII 문자만 포함
      result += trimmed[i];
    }
  }

  return result; // "정책이"
}
```

내부에서 사용하는 **언어 감지 함수** (`language-detector.js`):

```javascript
// 한글 문자인지 체크 (U+AC00 ~ U+D7A3)
export function isHangulChar(char) {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

// 단어의 언어 타입 판별
export function detectLanguage(word) {
  let hasHangul = false;
  let hasNonAscii = false;

  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i);

    if (code < 128) {
      // ASCII 문자 (영어/숫자)
    } else {
      hasNonAscii = true;
      if (isHangulChar(word[i])) {
        hasHangul = true;
      }
    }
  }

  if (hasHangul) return LanguageType.HANGUL;
  if (!hasNonAscii) return LanguageType.ENGLISH;
  return LanguageType.OTHER; // 중국어, 일본어 등
}
```

---

**Step 3) 형태소 분석 단계** - `utils/text-normalizer.js`

정규화된 단어에서 조사를 제거하고 동사/형용사를 필터링합니다.

```javascript
import { JOSA_ENDINGS, NG_ENDINGS } from "../constants/korean-rules.js";
import { endsWith } from "./string-utils.js";

/**
 * 형태소 분석: 조사 제거 + 동사/형용사 패턴 제외
 * "정책이" → "정책" (명사만 추출)
 */
export function analyzeMorpheme(word) {
  if (detectLanguage(word) !== LanguageType.HANGUL) return word;

  // 1단계: 조사 제거
  let base = stripJosa(word); // "정책이" → "정책"
  if (!base) return "";

  // 2단계: 동사/형용사/부사 패턴 체크 (제외 대상)
  for (const suf of NG_ENDINGS) {
    if (endsWith(base, suf)) return ""; // "중요하다" → "" (제외)
  }

  if (base.length >= 2 && endsWith(base, "한")) return ""; // "중요한" 제외
  if (base.length >= 2 && endsWith(base, "다")) return ""; // "만든다" 제외

  return base; // "정책" (명사만 통과)
}

/**
 * 조사 제거 (내부 헬퍼 함수)
 * "정책이" → "정책", "사회에서는" → "사회"
 */
export function stripJosa(word) {
  if (detectLanguage(word) !== LanguageType.HANGUL) return word;

  let base = word;

  // 긴 조사부터 우선 매칭 (예: "에서는" → "에서" → "에")
  for (const suf of JOSA_ENDINGS) {
    if (base.length > suf.length && endsWith(base, suf)) {
      // 1글자 조사는 최소 3글자 이상 단어에만 적용
      if (suf.length === 1 && base.length < 4) continue;

      base = base.substring(0, base.length - suf.length);
      break; // 1회만 제거
    }
  }

  return base;
}
```

---

**Step 4) 검증 단계** - `utils/word-validators.js`

형태소 분석을 거친 단어가 키워드로 적합한지 최종 검증합니다.

```javascript
import { STOPWORDS, FUNCTION_NOUNS } from "../constants/korean-rules.js";

/**
 * 키워드 검증: 불용어, 길이, 기능명사 체크
 * @param {string} word - 검증할 단어
 * @returns {boolean} true면 유효한 키워드
 */
export function isValidKeyword(word) {
  // 1. 불용어 체크 (그리고, 하지만 등)
  if (STOPWORDS.has(word)) return false;

  // 2. 최소 길이 체크 (2글자 이상)
  if (word.length < 2) return false;

  // 3. 기능 명사 제외 (것, 수, 때 등)
  if (FUNCTION_NOUNS.has(word)) return false;

  // 4. 모든 검증 통과 → 유효한 명사 키워드
  return true;
}
```

---

#### 전체 처리 흐름 요약

```
입력: "정책이 중요하다. 사회에서는 정책을 통해 변화를 만든다."
  ↓
1. analyzeFrequencyJS()
   - 공백으로 분리: ["정책이", "중요하다.", "사회에서는", ...]
  ↓
2. preprocessWord("정책이")
   ├─ normalizeWord("정책이")      → "정책이" (구두점 제거, 한글만)
   ├─ analyzeMorpheme("정책이")    → "정책" (조사 제거)
   └─ isValidKeyword("정책")       → true (검증 통과)
  ✓ 결과: "정책"

3. preprocessWord("중요하다.")
   ├─ normalizeWord("중요하다.")   → "중요하다" (구두점 제거)
   ├─ analyzeMorpheme("중요하다")  → "" (동사 패턴 제외)
   └─ (검증 전에 제외됨)
  ✗ 결과: null (제외)

4. 빈도 집계
   - Map { "정책" → 2, "사회" → 1, "변화" → 1 }
  ↓
5. 정렬 및 반환
   - [{ word: "정책", count: 2 }, { word: "사회", count: 1 }, ...]
```

---

## 📊 성능 비교 (WASM vs JavaScript)

1100만 단어 규모의 대용량 텍스트(25MB) 분석 시 성능 차이입니다.

| 구분 | 처리 속도 | 메모리 효율 | 특징 |
|------|-----------|-------------|------|
| **WebAssembly (C++)** | **매우 빠름** (약 2~3초) | **높음** | • 컴파일된 바이너리 실행<br>• 메모리 직접 제어 (포인터 등)<br>• 대용량 처리에 최적화 |
| **JavaScript** | 보통 (약 10~15초) | 보통 | • 인터프리터/JIT 실행<br>• 가비지 컬렉션(GC) 오버헤드<br>• 유연하지만 대량 연산 시 느림 |

> **🚀 WASM이 더 빠른 이유:**
> 1. **네이티브급 실행:** 브라우저가 해석하는 과정 없이 기계어에 가까운 코드로 바로 실행됩니다.
> 2. **메모리 구조:** JS의 무거운 객체(Object) 대신, C++의 가벼운 구조체와 포인터를 사용하여 메모리 낭비가 적습니다.
> 3. **GC 없음:** JS는 사용 안 하는 메모리를 정리하느라(GC) 중간중간 멈칫하지만, C++(WASM)은 필요한 메모리만 딱 쓰고 바로 반납하므로 끊김이 없습니다.

---

## 🎓 핵심 기술 포인트

### 1. UTF-8 멀티바이트 처리

- 한글은 UTF-8에서 3바이트로 인코딩
- 바이트 단위로 정확히 파싱해야 문자 깨짐 방지

### 2. 해시 테이블 활용

- `unordered_map` (C++) / `Map` (JS)
- 평균 O(1) 시간 복잡도로 빠른 조회

### 3. 한국어 처리 분리

- 한글: 조사 제거, 한국어 필터링 규칙 적용

### 4. WebAssembly 통합

- Emscripten으로 C++ 코드를 WASM으로 컴파일
- JavaScript와 seamless 통합

---

## 💥 시연

### https://our-pengus.github.io/text-frequency-analysis/