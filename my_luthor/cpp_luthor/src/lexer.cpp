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

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;

    while (true) {
        if (!peek()) {
            Token token{ "", TokenType::END_OF_FILE }; 
            tokens.push_back(token);
            // we're done!
            return tokens;

        } else if (std::isspace(static_cast<unsigned char>(peek().value()))) {
            advance(); // cast because old C func ^^^ needs to be positive 

        } else if ( contains(multi_start, peek().value())
                    && peek_next().value_or('\0') == '=') {
                                // ^^ safely unwrap optional being empty 

            if (peek().value() == '<') {
                std::string lexeme = "<=";
                Token token{ lexeme, TokenType::LESS_THAN_EQUAL };
                tokens.push_back(token);
                advance_twice();
            } else if (peek().value() == '>') {
                std::string lexeme = ">=";
                Token token{ lexeme, TokenType::GREATER_THAN_EQUAL };
                tokens.push_back(token);
                advance_twice();
            } else if (peek().value() == '=') {
                std::string lexeme = "==";
                Token token{ lexeme, TokenType::EQUAL_TO };
                tokens.push_back(token);
                advance_twice();
            } else if (peek().value() == '!') {
                std::string lexeme = "!=";
                Token token{ lexeme, TokenType::NOT_EQUAL };
                tokens.push_back(token);
                advance_twice();
            }

        } else if ( auto it = single_char_map.find(peek().value()); 
                    it != single_char_map.end() ) {

            auto t_type = it->second; // iterator is pointer to map 
            auto lexeme = std::string(1, peek().value());
            Token token{ lexeme, t_type };
            tokens.push_back(token);
            advance();
            
        } else if (isalpha(static_cast<unsigned char>(peek().value()))) {
            // keyword or identifier branch: 
            std::string word; 
           
            while ( peek()
                    && (isalnum(static_cast<unsigned char>(peek().value())) 
                    || peek().value() == '_') ) 
                {
                    word += peek().value();
                    advance();
                }

            if (auto it = keyword_map.find(word); it != keyword_map.end()) {
                auto keyword_t = it->second; 
                Token token{ word, keyword_t }; 
                tokens.push_back(token);
            } else {
                Token token{ word, TokenType::IDENTIFIER };
                tokens.push_back(token);
            }
    
        } else if (isdigit(static_cast<unsigned char>(peek().value()))) {
            std::string digits;

            while ( peek()
                    && isdigit(static_cast<unsigned char>(peek().value())) )  
                {
                    digits += peek().value();
                    advance();
                }          

            Token token{ digits, TokenType::NUMBER };
            tokens.push_back(token);

        } else {
            std::ostringstream oss;
            oss << "Unexpected characters starting with " << peek().value() 
                << " at " << pos;
            throw std::invalid_argument(oss.str());

        }
    }
}
