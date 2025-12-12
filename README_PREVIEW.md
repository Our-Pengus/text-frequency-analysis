# 한국어 텍스트 빈도 분석기

## 📋 프로젝트 개요

**한국어 전용** 텍스트 빈도 분석기로, 한국어 텍스트에서 단어의 출현 빈도를 분석하여 가장 자주 사용된 단어를 파악할 수 있는 웹 애플리케이션입니다.

### 주요 특징
- ✅ **한국어 전용 분석**: 영어, 중국어, 일본어 등 기타 언어 자동 제외
- ✅ **조사 자동 제거**: 은, 는, 이, 가, 을, 를 등 조사 자동 제거
- ✅ **불용어 필터링**: 조사, 연결어 등 의미 없는 단어 제거
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

### 2. 언어 타입 판별 (C++)

```cpp
LanguageType detectLanguage(const string& w) {
    if (w.empty()) return LanguageType::OTHER;
    
    bool hasHangul = false;
    bool hasNonAscii = false;
    
    for (size_t i = 0; i < w.size(); ) {
        unsigned char c = static_cast<unsigned char>(w[i]);
        
        if (c < 128) {
            i++;  // ASCII 문자
        } else {
            hasNonAscii = true;
            
            if (isHangulUTF8Byte(w, i)) {
                hasHangul = true;
                i += 3;  // UTF-8 한글은 3바이트
            } else {
                // 다른 UTF-8 멀티바이트 문자 처리
                if ((c & 0xE0) == 0xC0) i += 2;
                else if ((c & 0xF0) == 0xE0) i += 3;
                else if ((c & 0xF8) == 0xF0) i += 4;
                else i++;
            }
        }
    }
    
    if (hasHangul) return LanguageType::HANGUL;
    if (!hasNonAscii) return LanguageType::ENGLISH;
    return LanguageType::OTHER;
}
```

---

### 3. 조사 제거 (C++)

```cpp
string stripJosa(const string& w) {
    // 한글이 아니면 조사 제거하지 않음
    if (detectLanguage(w) != LanguageType::HANGUL) {
        return w;
    }
    
    static const vector<string> JO_ENDINGS = {
        "은","는","이","가","을","를","에","에서","에게",
        "으로","로","으로써","부터","까지",
        "와","과","도","만","의","들","들은","들이"
    };
    
    string base = w;
    bool stripped = true;
    
    // 여러 개 겹쳐 붙은 경우도 있으니 반복해서 잘라줌
    while (stripped) {
        stripped = false;
        for (const auto& suf : JO_ENDINGS) {
            if (base.size() > suf.size() && endsWith(base, suf)) {
                base = base.substr(0, base.size() - suf.size());
                stripped = true;
                break;
            }
        }
    }
    
    return base;
}
```

**예시**: "정책이" → "정책", "사회에서" → "사회"

---

### 4. 빈도 분석 메인 함수 (C++)

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

### 5. JavaScript 버전 (동일한 로직)

```javascript
// 한글 문자인지 체크 (유니코드 범위: U+AC00 ~ U+D7A3)
function isHangulChar(char) {
    const code = char.charCodeAt(0);
    return code >= 0xAC00 && code <= 0xD7A3;
}

// 단어의 언어 타입 판별
function detectLanguage(word) {
    if (!word || word.length === 0) return LanguageType.OTHER;
    
    let hasHangul = false;
    let hasNonAscii = false;
    
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const code = char.charCodeAt(0);
        
        if (code < 128) {
            // ASCII 문자
        } else {
            hasNonAscii = true;
            if (isHangulChar(char)) {
                hasHangul = true;
            }
        }
    }
    
    if (hasHangul) return LanguageType.HANGUL;
    if (!hasNonAscii) return LanguageType.ENGLISH;
    return LanguageType.OTHER;
}

// 빈도 분석
function analyzeFrequencyJS(text) {
    const freq = new Map();  // JavaScript Map 사용
    
    const words = text.split(/\s+/);
    
    for (const raw of words) {
        let norm = normalizeWord(raw);
        if (!norm) continue;
        
        norm = stripJosa(norm);
        if (!norm) continue;
        
        if (!isKeyword(norm)) continue;
        
        freq.set(norm, (freq.get(norm) || 0) + 1);
    }
    
    // 결과를 배열로 변환 및 정렬
    const results = [];
    for (const [word, count] of freq) {
        results.push({ word, count });
    }
    
    results.sort((a, b) => b.count - a.count);
    return results;
}
---

## 📊 성능 비교

- **WebAssembly (C++)**: 네이티브 수준의 성능
- **JavaScript**: 순수 JavaScript 구현
- 대용량 텍스트 처리 시 WASM이 더 빠름

---

## 🎓 핵심 기술 포인트

### 1. UTF-8 멀티바이트 처리
- 한글은 UTF-8에서 3바이트로 인코딩
- 바이트 단위로 정확히 파싱해야 문자 깨짐 방지

### 2. 해시 테이블 활용
- `unordered_map` (C++) / `Map` (JS)
- 평균 O(1) 시간 복잡도로 빠른 조회

### 3. 언어별 처리 분리
- 한글: 조사 제거, 한국어 필터링 규칙 적용
- 영어/기타 언어: 자동 제외

### 4. WebAssembly 통합
- Emscripten으로 C++ 코드를 WASM으로 컴파일
- JavaScript와 seamless 통합

---
```

---