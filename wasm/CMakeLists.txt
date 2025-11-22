cmake_minimum_required(VERSION 3.15)
project(text_frequency_analysis)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Emscripten 설정
if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    
    # 컴파일러 플래그
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\"]'")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ALLOW_MEMORY_GROWTH=1")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s MODULARIZE=1 -s EXPORT_NAME='createModule'")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --bind")
    
    add_executable(text_frequency text_frequency.cpp)
    
    # 출력 파일명 설정
    set_target_properties(text_frequency PROPERTIES
        OUTPUT_NAME "text_frequency"
        SUFFIX ".js"
    )
else()
    message(FATAL_ERROR "This project requires Emscripten. Please use emcmake.")
endif()

