#pragma once 
#include "tokens.h"

#include <optional>
#include <unordered_map>
#include <string>
#include <vector>


class Lexer {
public:
    Lexer(std::string stream);

    std::vector<Token> tokenize();

private:
    std::string stream;
    size_t pos;

    static const std::unordered_map<char, TokenType> single_char_map;
    static const std::vector<char> multi_start; 
    static const std::unordered_map<std::string, TokenType> keyword_map;

    void advance();
    void advance_twice();
    
    // helper templated class to check if something is in a sequence container 
    template<typename Container, typename T>
        bool contains(const Container& c, const T& value) {
        return std::find(c.begin(), c.end(), value) != c.end();
    }

    std::optional<char> peek();
    std::optional<char> peek_next();   
};