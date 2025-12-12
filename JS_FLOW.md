# JavaScript 한국어 텍스트 빈도 분석 흐름

## 전체 프로세스 개요

```
텍스트 입력 → 단어 분리 → 단어 전처리 → 검증 → 빈도 집계 → 정렬 및 반환
```

---

## 1단계: 텍스트를 공백으로 분리

- 입력된 텍스트를 공백(`\s+`) 기준으로 split
- 각 단어를 배열로 변환

```javascript
const words = text.split(/\s+/);
```

---

## 2단계: 단어 전처리 (Preprocessing)

### 2-1. 구두점과 언어 정리 (`normalizeWord`)

**위치**: `js/utils/text-normalizer.js`

**역할**:
- 구두점 제거 (마침표, 쉼표, 물음표 등)
- 한글이 아닌 단어는 빈 문자열 반환
- ASCII 문자 제거 (영어, 숫자 등)

**결과**: 순수 한글만 남은 단어

```javascript
normalizeWord("안녕하세요!123") → "안녕하세요"
normalizeWord("hello") → ""
```

### 2-2. 형태소 분석 (`analyzeMorpheme`)

**위치**: `js/utils/text-normalizer.js`

**역할**:

#### (1) 조사 제거
- 은/는/이/가/을/를/의/에/에서/로/와/과 등 제거
- 여러 개 겹쳐 붙은 경우도 반복 처리

```javascript
stripJosa("민주주의는") → "민주주의"
stripJosa("국민들에게서") → "국민들"
```

#### (2) 동사/형용사/부사 패턴 체크 및 제외
- `-게`, `-히`, `-아`, `-어`, `-면` 등으로 끝나는 단어 제외
- `-한`으로 끝나는 관형사형 제외
- `-다`로 끝나는 서술어 제외

```javascript
analyzeMorpheme("빠르게") → "" (제외)
analyzeMorpheme("좋았다") → "" (제외)
analyzeMorpheme("민주주의") → "민주주의" (통과)
```

---

## 3단계: 단어 검증 (`isValidKeyword`)

**위치**: `js/utils/word-validators.js`

전처리를 거친 단어가 실제로 분석할 가치가 있는지 최종 검증

### 3-1. 불용어 체크

**역할**: 의미 없는 접속사, 부사 제외

**제외 대상**:
- 그리고, 하지만, 또한, 그러나, 따라서 등

```javascript
isStopword("그리고") → true (제외)
isStopword("민주주의") → false (통과)
```

### 3-2. 최소 길이 체크

**역할**: 너무 짧은 단어 제외

**조건**: 2글자 미만 제외

```javascript
checkMinLength("국") → false (제외)
checkMinLength("국민") → true (통과)
```

### 3-3. 기능 명사 체크

**역할**: 의미가 약한 명사 제외

**제외 대상**:
- 것, 수, 등, 우리, 때, 곳, 데, 바 등

```javascript
isFunctionNoun("것") → true (제외)
isFunctionNoun("민주주의") → false (통과)
```

### 3-4. 강한 명사 패턴 체크 ⭐

**역할**: 특정 접미사로 끝나는 단어는 명사 가능성이 매우 높으므로 즉시 통과

**강한 명사 접미사**:
- `-제도`: 민주제도, 교육제도, 복지제도
- `-정책`: 경제정책, 환경정책, 복지정책
- `-법`: 헌법, 민법, 형법
- `-권`: 인권, 주권, 재산권
- `-성`: 가능성, 효율성, 안정성
- `-화`: 민주화, 세계화, 현대화

```javascript
isStrongNounPattern("민주제도") → true (즉시 통과!)
isStrongNounPattern("인권") → true (즉시 통과!)
isStrongNounPattern("가능성") → true (즉시 통과!)
```

### 3-5. 나머지 단어

**역할**: 위의 모든 검증을 통과한 단어는 명사로 간주

```javascript
// 3-1~3-3 모두 통과하고, 3-4가 아니어도
// 명사로 인정하여 최종 통과
isValidKeyword("국민") → true
isValidKeyword("사회") → true
```

---

## 4단계: 빈도 집계

- 전처리와 검증을 통과한 단어들을 `Map`에 저장
- 동일한 단어가 나올 때마다 카운트 증가

```javascript
const freq = new Map();
for (const word of processedWords) {
  freq.set(word, (freq.get(word) || 0) + 1);
}
```

---

## 5단계: 정렬 및 반환

- Map을 배열로 변환
- 빈도수 기준 **내림차순** 정렬
- `{word: string, count: number}` 형태로 반환

```javascript
[
  { word: "민주주의", count: 5 },
  { word: "국민", count: 3 },
  { word: "인권", count: 2 }
]
```

---

## 전체 데이터 흐름 예시

```
입력: "민주주의는 국민의 권리이다. 민주주의를 지켜야 한다."

1. 단어 분리
   → ["민주주의는", "국민의", "권리이다.", "민주주의를", "지켜야", "한다."]

2-1. normalizeWord
   → ["민주주의는", "국민의", "권리이다", "민주주의를", "지켜야", "한다"]

2-2. analyzeMorpheme (조사 제거 + 동사 제외)
   → ["민주주의", "국민", "권리", "민주주의", "", ""]

3. isValidKeyword (검증)
   → ["민주주의", "국민", "권리", "민주주의"]

4. 빈도 집계
   → Map { "민주주의" => 2, "국민" => 1, "권리" => 1 }

5. 정렬 및 반환
   → [
        { word: "민주주의", count: 2 },
        { word: "국민", count: 1 },
        { word: "권리", count: 1 }
      ]
```

---

## 주요 파일 구조

```
js/
├── text_frequency_js.js          # 메인 분석 함수
├── utils/
│   ├── text-normalizer.js        # normalizeWord, analyzeMorpheme
│   ├── word-validators.js        # isValidKeyword
│   ├── language-detector.js      # 언어 감지
│   └── string-utils.js           # 문자열 유틸
└── constants/
    └── korean-rules.js           # 불용어, 조사, 접미사 등
```

---

## 핵심 원칙

1. **단계별 책임 분리**: 정규화 → 형태소 분석 → 검증 → 집계
2. **한글 전용 처리**: 한글이 아닌 단어는 초기에 제외
3. **명사 중심 추출**: 동사/형용사/부사는 제외하고 명사만 수집
4. **강한 명사 우선**: 특정 접미사를 가진 단어는 명사로 즉시 인정
