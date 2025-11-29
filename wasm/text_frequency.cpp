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
    "와","과","도","만","및","등","때문에","위해","통해","또는","또한","또",

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
        "에는","에게는","으로써","으로서","으로는","으로","까지","부터",
        "에서","에게","에는","에","의",
        "은","는","이","가","을","를","와","과","도","만"
    };

    for (const auto& suf : JO_ENDINGS) {
        if (w.size() > suf.size() * 2 && endsWith(w, suf)) {
            return w.substr(0, w.size() - suf.size());
        }
    }
    return w;
}


// 노이즈 단어 제거
// - 영어: 너무 짧은 단어 제거
// - 한국어: 동사/형용사형 접미사 제거
bool isNoise(const string& w) {
    bool isAscii = true;
    for (unsigned char c : w) {
        if (c >= 128) { isAscii = false; break; }
    }

    if (STOPWORDS.find(w) != STOPWORDS.end())
        return true;

    // 영어 처리
    if (isAscii) {
        if (w.size() <= 2) return true;  // 1~2글자 제거
        return false;
    }

    // 한국어 처리
    if (w.size() <= 3) return true; // 1글자 한글은 제거

    static const vector<string> VERB_END = {
        "한다","된다","있다","가진다","받는다","하였다","하며","하면서","위하여","의하여"
    };
    for (const auto& suf : VERB_END)
        if (endsWith(w, suf)) return true;

    static const vector<string> ADJ_END = {"관한","관련한"};
    for (const auto& suf : ADJ_END)
        if (endsWith(w, suf)) return true;

    return false;
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

        if (isNoise(norm)) continue;

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
