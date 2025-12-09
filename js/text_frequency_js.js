// JavaScript 버전 텍스트 빈도 분석 (한국어 전용)

// 불용어(stopwords) 목록
const STOPWORDS = new Set([
    "은","는","이","가","을","를","에","에서","에게","으로","으로써","부터","까지",
    "와","과","도","만","및","등","때문에","위해","통해","또는","또한","또","때에","바에",
    "모든","대한","그리고", "그러나", "하지만"
]);

// 언어 타입 구분
const LanguageType = {
    ENGLISH: 'ENGLISH',
    HANGUL: 'HANGUL',
    OTHER: 'OTHER'
};

// 한글 문자인지 체크 (유니코드 범위: U+AC00 ~ U+D7A3)
function isHangulChar(char) {
    const code = char.charCodeAt(0);
    // 한글 완성형: U+AC00 (가) ~ U+D7A3 (힣)
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

// 앞뒤 구두점 제거
function trimPunct(word) {
    const punct = ".,!?;:\"'()[]{}<>";
    let start = 0;
    let end = word.length;
    
    while (start < word.length && punct.includes(word[start])) start++;
    while (end > start && punct.includes(word[end - 1])) end--;
    
    return word.substring(start, end);
}

// 단어 정규화
// - 한글만 처리
// - 한글이 아니면 빈 문자열 반환
function normalizeWord(word) {
    const trimmed = trimPunct(word);
    if (!trimmed) return '';
    
    // 한글이 아니면 빈 문자열 반환
    if (detectLanguage(trimmed) !== LanguageType.HANGUL) {
        return '';
    }
    
    // 한글만 추출 (ASCII 문자 제거)
    let result = '';
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

// 접미사 체크
function endsWith(str, suffix) {
    if (str.length < suffix.length) return false;
    return str.substring(str.length - suffix.length) === suffix;
}

// 조사 제거 (한국어 전용)
function stripJosa(word) {
    // 한글이 아니면 조사 제거하지 않음
    if (detectLanguage(word) !== LanguageType.HANGUL) {
        return word;
    }
    
    const JO_ENDINGS = [
        // 기본 조사
        "은","는","이","가","을","를","에","에서","에게",
        "으로","로","으로써","부터","까지",
        "와","과","도","만",
        
        // 보조적 요소
        "께서","조차","마저","뿐","마다",
        
        // 소유/복수
        "의","들","들은","들이","라도","까지의","부터의"
    ];
    
    let base = word;
    let stripped = true;
    
    // 여러 개 겹쳐 붙은 경우도 있으니 반복해서 잘라줌
    while (stripped) {
        stripped = false;
        
        for (const suf of JO_ENDINGS) {
            if (base.length > suf.length && endsWith(base, suf)) {
                base = base.substring(0, base.length - suf.length);
                stripped = true;
                break;
            }
        }
    }
    
    return base;
}

// 키워드 필터링
function isKeyword(word) {
    if (!word || word.length === 0) return false;
    
    // 한글이 아니면 제외
    if (detectLanguage(word) !== LanguageType.HANGUL) {
        return false;
    }
    
    // 1. 불용어면 바로 제외
    if (STOPWORDS.has(word)) return false;
    
    // 2. 한글 1글자 이하 제거
    if (word.length <= 1) return false;
    
    // (1) 동사/형용사/부사/연결 표현 느낌의 금지 끝말 제거
    const NG_ENDINGS = [
        // 동사/형용사 기본형/활용
        "한다","된다","이다","있다","없다","같다","느낀다","생각한다",
        "하였다","되었다","이었다",
        "하는","되는","있는","없는",
        "하며","하면서","하면서도",
        "하고","되고","해도","되어도",
        
        // 부사/연결
        "처럼","같이","대로","마다","라도","부터","까지","만큼",
        
        // 관형사/연결 표현
        "어떤","이런","저런","그런",
        "정하여","정하는","관하여","정하",
        "위하여","대하여","관한","관련한"
    ];
    
    for (const suf of NG_ENDINGS) {
        if (endsWith(word, suf)) return false;
    }
    
    // (1-1) "…한"으로 끝나는 관형사형 제거 (필요한, 관련한, 정한 등)
    if (word.length >= 2 && endsWith(word, "한")) return false;
    
    // (2) 의미가 약한 기능 명사 제거
    const FUNCTION_NOUNS = new Set([
        "것","수","때","등","측","부분","경우","정도","우리","기타","이상"
    ]);
    if (FUNCTION_NOUNS.has(word)) return false;
    
    // (3) '다'로 끝나는 단어는 대부분 서술어 → 제거
    if (word.length >= 2 && endsWith(word, "다")) return false;
    
    // (4) 명사 접미사 패턴: 명사 가능성 매우 높음
    const STRONG_NOUN_SUFFIX = [
        "제도","정책","사회","문제","관","법","권","성","화","율","률","력",
        "자","자들","인","학","론","점","상","안","주의","주의성","체제","구조","기구","기관","단체","운동"
    ];
    
    for (const suf of STRONG_NOUN_SUFFIX) {
        if (endsWith(word, suf)) return true;
    }
    
    return true;
}

// 텍스트를 단어로 분리하고 빈도 분석
function analyzeFrequencyJS(text) {
    const freq = new Map();
    
    // 공백으로 단어 분리
    const words = text.split(/\s+/);
    
    for (const raw of words) {
        let norm = normalizeWord(raw);
        if (!norm) continue;
        
        norm = stripJosa(norm);
        if (!norm) continue;
        
        if (!isKeyword(norm)) continue;
        
        freq.set(norm, (freq.get(norm) || 0) + 1);
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
