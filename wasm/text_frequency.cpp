#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <algorithm>
#include <sstream>
#include <cctype>
#include <cstring>
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace std;
using namespace emscripten;


// 텍스트 빈도 분석 결과 구조체
struct FrequencyResult {
    string word;
    int count;
};


 // 불용어(stopwords) 목록
 // 한국어 조사/연결어 제거
static const unordered_set<string> STOPWORDS = {
    "은","는","이","가","을","를","에","에서","에게","으로","으로써","부터","까지",
    "와","과","도","만","및","등","때문에","위해","통해","또는","또한","또","때에","바에",
    "모든","대한","그리고", "그러나", "하지만"
};


// 언어 타입 구분
enum class LanguageType {
    ENGLISH,    // 영어 (ASCII)
    HANGUL,     // 한글
    OTHER       // 기타 언어 (중국어, 일본어 등)
};

// UTF-8 바이트가 한글 범위인지 체크
// 한글 완성형: U+AC00 (가) ~ U+D7A3 (힣)
// UTF-8 인코딩: 0xEA 0xB0 0x80 ~ 0xED 0x9E 0xA3
bool isHangulUTF8Byte(const string& s, size_t pos) {
    if (pos + 2 >= s.size()) return false;  // 3바이트가 필요하므로 pos+2까지 접근 가능해야 함
    
    unsigned char b1 = static_cast<unsigned char>(s[pos]);
    unsigned char b2 = static_cast<unsigned char>(s[pos + 1]);
    unsigned char b3 = static_cast<unsigned char>(s[pos + 2]);
    
    // UTF-8 3바이트 문자 체크 (0xE0 ~ 0xEF로 시작)
    if ((b1 & 0xF0) != 0xE0) return false;
    if ((b2 & 0xC0) != 0x80) return false;
    if ((b3 & 0xC0) != 0x80) return false;
    
    // 한글 범위 체크: 0xEA 0xB0 0x80 ~ 0xED 0x9E 0xA3
    if (b1 == 0xEA) {
        // 0xEA 0xB0 0x80 ~ 0xEA 0xBF 0xBF
        return b2 >= 0xB0;
    } else if (b1 == 0xEB || b1 == 0xEC) {
        // 0xEB 0x80 0x80 ~ 0xEC 0xBF 0xBF
        return true;
    } else if (b1 == 0xED) {
        // 0xED 0x80 0x80 ~ 0xED 0x9E 0xA3
        if (b2 < 0x9E) return true;
        if (b2 == 0x9E) return b3 <= 0xA3;
        return false;
    }
    
    return false;
}

// 단어의 언어 타입 판별
LanguageType detectLanguage(const string& w) {
    if (w.empty()) return LanguageType::OTHER;
    
    bool hasHangul = false;
    bool hasNonAscii = false;
    
    for (size_t i = 0; i < w.size(); ) {
        unsigned char c = static_cast<unsigned char>(w[i]);
        
        if (c < 128) {
            // ASCII 문자 (영어/숫자)
            i++;
        } else {
            // 비-ASCII 문자
            hasNonAscii = true;
            
            if (isHangulUTF8Byte(w, i)) {
                hasHangul = true;
                i += 3; // UTF-8 한글은 3바이트
            } else {
                // UTF-8 멀티바이트 문자 길이 계산
                if ((c & 0xE0) == 0xC0) i += 2;
                else if ((c & 0xF0) == 0xE0) i += 3;
                else if ((c & 0xF8) == 0xF0) i += 4;
                else i++; // 잘못된 바이트는 건너뛰기
            }
        }
    }
    
    // 한글이 하나라도 있으면 한글로 판단
    if (hasHangul) return LanguageType::HANGUL;
    
    // ASCII만 있으면 영어
    if (!hasNonAscii) return LanguageType::ENGLISH;
    
    // 그 외는 기타 언어
    return LanguageType::OTHER;
}

//앞뒤 구두점 제거
string trimPunct(const string& w) {
    const string punct = ".,!?;:\"'()[]{}<>";
    size_t s = 0, e = w.size();

    while (s < w.size() && punct.find(w[s]) != string::npos) s++;
    while (e > s && punct.find(w[e - 1]) != string::npos) e--;

    return w.substr(s, e - s);
}


 // 단어 정규화
 // - 한글만 처리
 // - 한글이 아니면 빈 문자열 반환
string normalizeWord(const string& w) {
    string t = trimPunct(w);
    if (t.empty()) return t;
    
    // 한글이 아니면 빈 문자열 반환
    if (detectLanguage(t) != LanguageType::HANGUL) {
        return "";
    }
    
    // 한글: UTF-8 멀티바이트 문자를 올바르게 처리
    string r;
    r.reserve(t.size());
    
    for (size_t i = 0; i < t.size(); ) {
        unsigned char c = static_cast<unsigned char>(t[i]);
        
        if (c < 128) {
            // ASCII 문자는 제거 (한글만 처리)
            i++;
        } else {
            // UTF-8 멀티바이트 문자 처리
            size_t charLen = 1;
            if ((c & 0xE0) == 0xC0) charLen = 2;
            else if ((c & 0xF0) == 0xE0) charLen = 3;
            else if ((c & 0xF8) == 0xF0) charLen = 4;
            
            if (i + charLen <= t.size()) {
                // 멀티바이트 문자 전체를 복사
                r.append(t.substr(i, charLen));
                i += charLen;
            } else {
                i++;
            }
        }
    }
    
    return r;
}

// 접미사 체크
bool endsWith(const string& s, const string& suf) {
    if (s.size() < suf.size()) return false;
    return equal(suf.rbegin(), suf.rend(), s.rbegin());
}


// 조사 제거 (한국어 전용)
string stripJosa(const string& w) {
    // 한글이 아니면 조사 제거하지 않음
    if (detectLanguage(w) != LanguageType::HANGUL) {
        return w;
    }
    
    static const vector<string> JO_ENDINGS = {
        // 기본 조사
        "은","는","이","가","을","를","에","에서","에게",
        "으로","로","으로써","부터","까지",
        "와","과","도","만",

        // 보조적 요소
        "께서","조차","마저","뿐","마다",

        // 소유/복수
        "의","들","들은","들이","라도","까지의","부터의"
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


bool isKeyword(const string& w) {
    if (w.empty()) return false;

    // 한글이 아니면 제외
    if (detectLanguage(w) != LanguageType::HANGUL) {
        return false;
    }

    // 1. 불용어면 바로 제외
    if (STOPWORDS.find(w) != STOPWORDS.end())
        return false;

    // 2. 한글 1글자(≈3바이트)이하 제거
    if (w.size() <= 3) return false;

    // (1) 동사/형용사/부사/연결 표현 느낌의 금지 끝말 제거
    static const vector<string> NG_ENDINGS = {
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
    };

    for (const auto& suf : NG_ENDINGS) {
        if (endsWith(w, suf))
            return false;
    }

    // (1-1) "…한"으로 끝나는 관형사형 제거 (필요한, 관련한, 정한 등)
    if (w.size() >= 6 && endsWith(w, "한"))
        return false;

    // (2) 의미가 약한 기능 명사 제거
    static const unordered_set<string> FUNCTION_NOUNS = {
        "것","수","때","등","측","부분","경우","정도","우리","기타","이상",
    };
    if (FUNCTION_NOUNS.find(w) != FUNCTION_NOUNS.end())
        return false;

    // (3) '다'로 끝나는 단어는 대부분 서술어 → 제거
    if (w.size() >= 6 && endsWith(w, "다"))
        return false;

    // (4) 명사 접미사 패턴: 명사 가능성 매우 높음
    static const vector<string> STRONG_NOUN_SUFFIX = {
        "제도","정책","사회","문제","관","법","권","성","화","율","률","력",
        "자","자들","인","학","론","점","상","안","주의","주의성","체제","구조","기구","기관","단체","운동"
    };

    for (const auto& suf : STRONG_NOUN_SUFFIX) {
        if (endsWith(w, suf))
            return true;
    }

    return true;
}


// 텍스트를 단어로 분리하고 빈도 분석
vector<FrequencyResult> analyzeFrequency(const string& text) {
    unordered_map<string, int> freq;

    istringstream iss(text);
    string raw;

    while (iss >> raw) {
        string norm = normalizeWord(raw);
        if (norm.empty()) continue;

        norm = stripJosa(norm);
        if (norm.empty()) continue;

        if (!isKeyword(norm)) continue;

        freq[norm]++;
    }

    vector<FrequencyResult> results;
    results.reserve(freq.size());
    for (auto& p : freq) {
        results.push_back({p.first, p.second});
    }

    sort(results.begin(), results.end(),
         [](const FrequencyResult& a, const FrequencyResult& b) {
             return a.count > b.count;
         });

    return results;
}


// WASM에서 호출 가능한 텍스트 분석 함수
EMSCRIPTEN_KEEPALIVE
vector<FrequencyResult> getFrequencyAnalysis(const string& text) {
    return analyzeFrequency(text);
}


// Emscripten 바인딩
EMSCRIPTEN_BINDINGS(text_frequency) {
    value_object<FrequencyResult>("FrequencyResult")
        .field("word", &FrequencyResult::word)
        .field("count", &FrequencyResult::count);

    register_vector<FrequencyResult>("FrequencyResultVector");

    emscripten::function("getFrequencyAnalysis", &getFrequencyAnalysis);
}
