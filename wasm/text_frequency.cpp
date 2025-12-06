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
 // 영어 관사/전치사/대명사 제거
static const unordered_set<string> STOPWORDS = {
    // 한국어
    "은","는","이","가","을","를","에","에서","에게","으로","으로써","부터","까지",
    "와","과","도","만","및","등","때문에","위해","통해","또는","또한","또","때에","바에",
    "모든","대한","그리고", "그러나", "하지만"

    // 영어
    "the","a","an","and","or","but","to","of","in","on","for","with","as","at","by",
    "is","are","was","were","be","been","being",
    "this","that","these","those",
    "it","its","i","you","he","she","we","they","them","my","your","our","their"
};


//앞뒤 구두점 제거
string trimPunct(const string& w) {
    const string punct = ".,!?;:\"'()[]{}<>";
    size_t s = 0, e = w.size();

    while (s < w.size() && punct.find(w[s]) != string::npos) s++;
    while (e > s && punct.find(w[e - 1]) != string::npos) e--;

    return w.substr(s, e - s);
}


 // 단어 정규화
 // - 영어는 소문자 변환
 // - 숫자/영문만 허용
 // - 한글은 그대로 통과
string normalizeWord(const string& w) {
    string t = trimPunct(w);
    string r;
    r.reserve(t.size());

    for (unsigned char c : t) {
        if (c < 128) {
            // 영어/숫자
            if (isalnum(c)) r.push_back(tolower(c));
        } else {
            // 한글 그대로
            r.push_back(c);
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

    // 1. 공통: 불용어면 바로 제외
    if (STOPWORDS.find(w) != STOPWORDS.end())
        return false;

    // 2. 영어/한글 구분
    bool isAscii = true;
    for (unsigned char c : w) {
        if (c >= 128) {
            isAscii = false;
            break;
        }
    }

    // ---------- 영어 처리 ----------
    if (isAscii) {
        // 1~2글자짜리 영어 단어는 정보가 거의 없으니 제거
        if (w.size() <= 2) return false;

        // 숫자만으로 구성된 토큰은 제거 (연도, 페이지 번호 등)
        bool allDigit = true;
        for (unsigned char c : w) {
            if (!isdigit(c)) {
                allDigit = false;
                break;
            }
        }
        if (allDigit) return false;

        // 그 외 영어 단어는 일단 키워드로 인정
        return true;
    }

    // ---------- 한국어 처리 ----------
    // 한글 1글자(≈3바이트)이하 제거
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
