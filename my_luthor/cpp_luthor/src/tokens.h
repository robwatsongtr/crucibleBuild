#pragma once

#include <string>

enum class TokenType {
    // single char symbols
    PLUS,
    MINUS,
    MULTIPLY,
    DIVIDE,
    L_PARENS,
    R_PARENS,
    LESS_THAN,
    GREATER_THAN,

    // multi char symbols
    LESS_THAN_EQUAL,
    GREATER_THAN_EQUAL,
    EQUAL_TO,
    NOT_EQUAL,

    // value carrying
    NUMBER,
    IDENTIFIER,

    // keywords
    KNOW,
    SUPPOSE,
    DOOM,
    CRIME,

    OTHERWISE,
    END,

    END_OF_FILE
};

inline std::string tokenTypeToString(TokenType tok) {
    switch(tok) {
        case TokenType::PLUS:               return "PLUS";
        case TokenType::MINUS:              return "MINUS";
        case TokenType::MULTIPLY:           return "MULTIPLY";
        case TokenType::DIVIDE:             return "DIVIDE";
        case TokenType::L_PARENS:           return "L_PARENS";
        case TokenType::R_PARENS:           return "R_PARENS";
        case TokenType::LESS_THAN:          return "LESS_THAN";
        case TokenType::GREATER_THAN:       return "GREATER_THAN";
        case TokenType::LESS_THAN_EQUAL:    return "LESS_THAN_EQUAL";
        case TokenType::GREATER_THAN_EQUAL: return "GREATER_THAN_EQUAL";
        case TokenType::EQUAL_TO:           return "EQUAL_TO";
        case TokenType::NOT_EQUAL:          return "NOT_EQUAL";
        case TokenType::NUMBER:             return "NUMBER";
        case TokenType::IDENTIFIER:         return "IDENTIFIER";
        case TokenType::KNOW:               return "KNOW";
        case TokenType::SUPPOSE:            return "SUPPOSE";
        case TokenType::DOOM:               return "DOOM";
        case TokenType::CRIME:              return "CRIME";
        case TokenType::OTHERWISE:          return "OTHERWISE";
        case TokenType::END:                return "END";
        case TokenType::END_OF_FILE:        return "END_OF_FILE";
    }
    return "UNKNOWN";
}

struct Token {
    std::string lexeme;
    TokenType token_type;

    std::string toString() const  {
       return "Token("  
            + tokenTypeToString(token_type) 
            + ", " + lexeme + ")";   
    }
};

