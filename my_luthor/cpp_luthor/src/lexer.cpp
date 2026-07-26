#include "lexer.h"

#include <stdexcept>
#include <cctype>
#include <sstream>

// we std::move the stream to prevent a second copy
Lexer::Lexer(std::string stream) : stream(std::move(stream)), pos(0) {}

const std::unordered_map<char, TokenType> Lexer::single_char_map = {
    { '+', TokenType::PLUS },
    { '-', TokenType::MINUS },
    { '*', TokenType::MULTIPLY },
    { '/', TokenType::DIVIDE },
    { '(', TokenType::L_PARENS },
    { ')', TokenType::R_PARENS },
    { '>', TokenType::GREATER_THAN },
    { '<', TokenType::LESS_THAN }
};

const std::vector<char> Lexer::multi_start = { '<', '>', '=', '!' };

const std::unordered_map<std::string, TokenType> Lexer::keyword_map = {
    { "know", TokenType::KNOW },
    { "suppose", TokenType::SUPPOSE },
    { "otherwise", TokenType::OTHERWISE },
    { "end", TokenType::END },
    { "doom", TokenType::DOOM },
    { "crime", TokenType::CRIME }
};

void Lexer::advance() {
    pos++;
}

void Lexer::advance_twice() {
    pos += 2; 
}

std::optional<char> Lexer::peek() {
    if (pos < stream.size()) {
        return stream[pos];
    } else {
        return std::nullopt;
    }
}

std::optional<char> Lexer::peek_next() {
    if ((pos + 1) < stream.size()) {
        return stream[pos + 1];
    } else {
        return std::nullopt;
    }
}

