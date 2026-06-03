#pragma once 
#include "tokens.h"
#include "nodes.h"

#include <cstddef>
#include <vector>
#include <optional>
#include <algorithm>

class Parser {
public:
    Parser(const std::vector<Token>& tok_stream);

    std::unique_ptr<ProgramNode> program();

private:
    size_t tok_pos; 
    const std::vector<Token>& tok_stream; 
    static const std::vector<TokenType> comparison_tokens;

    void advance();
    std::optional<Token> token_peek();
    Token consume(TokenType expected_token);

    // EBNF methods: 
    std::unique_ptr<ASTNode> statement();
    std::unique_ptr<ASTNode> assignment();
    std::unique_ptr<ASTNode> conditional();
    std::unique_ptr<ASTNode> print_statement();
    std::unique_ptr<ASTNode> while_statement();
    std::unique_ptr<ASTNode> block();

    std::unique_ptr<ASTNode> expression();
    std::unique_ptr<ASTNode> comparison();
    std::unique_ptr<ASTNode> term();
    std::unique_ptr<ASTNode> factor();
    std::unique_ptr<ASTNode> unary();
    std::unique_ptr<ASTNode> primary();

    // helper class to check if something is in a sequence container 
    template<typename Container, typename T>
        bool contains(const Container& c, const T& value) {
        return std::find(c.begin(), c.end(), value) != c.end();
    }
};

