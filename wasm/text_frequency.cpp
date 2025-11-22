#include <string>
#include <unordered_map>
#include <vector>
#include <algorithm>
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

// 텍스트를 단어로 분리하고 빈도 분석
vector<FrequencyResult> analyzeFrequency(const string& text) {
    unordered_map<string, int> frequencyMap;
    
    // 텍스트를 소문자로 변환하고 단어로 분리
    string lowerText = text;
    transform(lowerText.begin(), lowerText.end(), lowerText.begin(), ::tolower);
    
    // 단어 분리 (공백, 구두점 기준)
    // 한글도 지원하기 위해 공백/구두점이 아닌 문자는 모두 단어로 인식
    string word = "";
    for (unsigned char c : lowerText) {
        // 공백, 탭, 줄바꿈, 구두점이 아닌 경우 단어에 추가
        if (!isspace(c) && c != '.' && c != ',' && c != '!' && c != '?' && 
            c != ';' && c != ':' && c != '(' && c != ')' && c != '[' && 
            c != ']' && c != '{' && c != '}' && c != '"' && c != '\'') {
            word += c;
        } else {
            if (!word.empty() && word.length() > 0) {
                frequencyMap[word]++;
                word = "";
            }
        }
    }
    
    // 마지막 단어 처리
    if (!word.empty()) {
        frequencyMap[word]++;
    }
    
    // 결과를 벡터로 변환
    vector<FrequencyResult> results;
    for (const auto& pair : frequencyMap) {
        results.push_back({pair.first, pair.second});
    }
    
    // 빈도순으로 정렬 (내림차순)
    sort(results.begin(), results.end(), 
         [](const FrequencyResult& a, const FrequencyResult& b) {
             return a.count > b.count;
         });
    
    return results;
}

// WASM에서 호출 가능한 함수: 텍스트 빈도 분석
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

