// JavaScript 버전 텍스트 빈도 분석

function analyzeFrequencyJS(text) {
    const frequencyMap = new Map();
    
    // 텍스트를 소문자로 변환
    const lowerText = text.toLowerCase();
    
    // 단어 분리 (공백, 구두점 기준)
    let word = '';
    for (let i = 0; i < lowerText.length; i++) {
        const c = lowerText[i];
        const charCode = c.charCodeAt(0);
        
        // 공백, 탭, 줄바꿈, 구두점이 아닌 경우 단어에 추가
        if (!/\s/.test(c) && 
            c !== '.' && c !== ',' && c !== '!' && c !== '?' && 
            c !== ';' && c !== ':' && c !== '(' && c !== ')' && 
            c !== '[' && c !== ']' && c !== '{' && c !== '}' && 
            c !== '"' && c !== "'") {
            word += c;
        } else {
            if (word.length > 0) {
                frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
                word = '';
            }
        }
    }
    
    // 마지막 단어 처리
    if (word.length > 0) {
        frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
    }
    
    // 결과를 배열로 변환
    const results = [];
    for (const [word, count] of frequencyMap) {
        results.push({ word, count });
    }
    
    // 빈도순으로 정렬 (내림차순)
    results.sort((a, b) => b.count - a.count);
    
    return results;
}

