// JavaScript 버전 텍스트 빈도 분석 (한국어 전용)

// 불용어(stopwords) 목록
const STOPWORDS = new Set([
    "그리고","그러나","하지만","또는","또한","또","때문에","위해",
    "통해","등","및","대한","대하여","관하여","모든","이르되","말하되","가로되",
    "때에","위하여","함께","이는",
    "그","이","저","그들","그녀","그것","이것","저것",
    "너","너희","너희들","나","우리","우리들","저희","저희들",
    "누구","무엇","어디","언제","어느","어떤","이런","저런","그런",
    "내","네","자기","바"
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
        "에게서는","에게서","에게는","에게도","에게",
        "에서는","에서의","에서",
        "으로써는","으로써","으로는","으로도","으로",
        "로는","로도","로",
        "부터는","부터도","부터",
        "까지는","까지도","까지",
        "께서는","께서","께",
        "에는","에도","에만","에",
        "의는","의가","의",
        "과는","과도","과",
        "와는","와도","와",
        "을은","을","를은","를",
        "이는","이가","이",
        "가는","가",
        "은","는","도","만",
        "들의","들은","들이","들",
        "조차","마저","뿐","마다","라도"
    ];
    
    let base = word;
    
    // 조사 1회 제거 (단어 중 조사에 포함된 단어도 존재하기 때문에)
    for (const suf of JO_ENDINGS) {
    if (base.length > suf.length && endsWith(base, suf)) {
      if (suf.length === 1 && base.length < 3) continue;
      base = base.substring(0, base.length - suf.length);
      break;
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
