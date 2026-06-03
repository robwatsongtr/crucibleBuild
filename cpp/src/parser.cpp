#include "parser.h"
#include "nodes.h"

#include <stdexcept>
#include <sstream>


Parser::Parser(const std::vector<Token>& tok_stream) : 
    tok_pos(0), tok_stream(tok_stream) {}

const std::vector<TokenType> Parser::comparison_tokens = {
    TokenType::LESS_THAN,
    TokenType::GREATER_THAN,
    TokenType::LESS_THAN_EQUAL,
    TokenType::GREATER_THAN_EQUAL,
    TokenType::EQUAL_TO,
    TokenType::NOT_EQUAL
};

void Parser::advance() { 
    tok_pos++; 
}

std::optional<Token> Parser::token_peek() {
    auto token = tok_stream[tok_pos];

    if (token.token_type != TokenType::END_OF_FILE ) {
        return token; 
    } else {
        return std::nullopt; 
    }
}

Token Parser::consume(TokenType expected_token) {
    if(!token_peek()) {
        std::ostringstream oss;
        oss << "Unexpected end of input at " << tok_pos;     
        throw std::runtime_error(oss.str());
    } 

    auto token = token_peek().value(); 

    if (token.token_type == expected_token) {
        advance();
        return token;
    } else {
        std::ostringstream oss;
        oss << "Unexpected token '" << token.lexeme 
            << "' at " << tok_pos;      
        throw std::runtime_error(oss.str());
    }
}

std::unique_ptr<ProgramNode> Parser::program() {
    std::vector<std::unique_ptr<ASTNode>> statements;

    while (token_peek()) {
        auto stmnt = statement();
        statements.push_back(std::move(stmnt));
    }

    auto program = std::make_unique<ProgramNode>(
        std::move(statements)
    );

    return program;
}

// Statement Dispatch --------------------------------

std::unique_ptr<ASTNode> Parser::statement() {
    switch (token_peek().value().token_type) {
        case TokenType::KNOW:
            return assignment();

        case TokenType::SUPPOSE:
            return conditional();

        case TokenType::DOOM:
            return print_statement();

        case TokenType::CRIME:
            return while_statement();

        default:
            return expression();
    };
}

// Statement methods ---------------------------------------

std::unique_ptr<ASTNode> Parser::assignment() {
    consume(TokenType::KNOW);
    auto var_name = consume(TokenType::IDENTIFIER).lexeme; 
    auto expr = expression();

    auto root = std::make_unique<AssignNode>(
        var_name, std::move(expr)
    );

    return root; 
}

std::unique_ptr<ASTNode> Parser::conditional() {
    consume(TokenType::SUPPOSE);
    auto condition = expression();
    auto then_block = block(); 
    std::unique_ptr<ASTNode> else_block = nullptr;

    // check for else block first 
    if (token_peek() 
        && token_peek().value().token_type == TokenType::OTHERWISE) {

        consume(TokenType::OTHERWISE);
        else_block = block();
    }

    auto root = std::make_unique<ConditionalNode> (
        std::move(condition), 
        std::move(then_block),
        std::move(else_block)
    );

    return root; 
}

std::unique_ptr<ASTNode> Parser::print_statement() {
    consume(TokenType::DOOM); 
    auto expr = expression();

    auto root = std::make_unique<PrintNode> (
        std::move(expr)
    );

    return root; 
}

std::unique_ptr<ASTNode> Parser::while_statement() {
    consume(TokenType::CRIME);
    auto condition = expression();
    auto body_block = block();

    auto root = std::make_unique<WhileNode>(
        std::move(condition), std::move(body_block)
    );

    return root; 
}

std::unique_ptr<ASTNode> Parser::block() {
    std::vector<std::unique_ptr<ASTNode>> block; 

    while ( token_peek() 
            && token_peek().value().token_type != TokenType::END) 
    {
        auto stmnt = statement();
        block.push_back(std::move(stmnt));
    }

    consume(TokenType::END);

    auto root = std::make_unique<BlockNode> (
        std::move(block)
    );

    return root; 
}

// Expression methods ---------------------------------------

std::unique_ptr<ASTNode> Parser::expression() {
    auto root = comparison();

    return root; 
}

std::unique_ptr<ASTNode> Parser::comparison() {
    auto root = term(); // left side 

    while ( token_peek() && contains (
                comparison_tokens, token_peek().value().token_type 
          )) 
    {
        auto comp = token_peek().value();
        consume(comp.token_type);
        auto r_node = term(); // right side
        root = std::make_unique<BinaryOpNode>(
            comp, std::move(root), std::move(r_node)
        );
    }

    return root;
}

std::unique_ptr<ASTNode> Parser::term() {
    auto root = factor();

    while ( token_peek() 
            && ( token_peek().value().token_type == TokenType::PLUS ||
                 token_peek().value().token_type == TokenType::MINUS))
    {
        auto op = token_peek().value();
        consume(op.token_type);
        auto r_node = factor(); 
        root = std::make_unique<BinaryOpNode>(
            op, std::move(root), std::move(r_node)
        );
    }    

    return root; 
}

std::unique_ptr<ASTNode> Parser::factor() {
    auto root = unary();

    while ( token_peek() 
            && ( token_peek().value().token_type == TokenType::MULTIPLY ||
                 token_peek().value().token_type == TokenType::DIVIDE)) 
    {
        auto op = token_peek().value();
        consume(op.token_type);
        auto r_node = unary(); 
        root = std::make_unique<BinaryOpNode>(
            op, std::move(root), std::move(r_node)
        );
    }    

    return root; 
}

std::unique_ptr<ASTNode> Parser::unary() {
    if ( token_peek() && token_peek().value().token_type == TokenType::MINUS) {
        auto op = token_peek().value();
        consume(op.token_type);
        auto operand = primary();

        auto root = std::make_unique<UnaryOpNode>(
            op, std::move(operand)
        );

        return root; 
    } else {
        auto root = primary();
        return root; 
    }
}

std::unique_ptr<ASTNode> Parser::primary() {
    if ( token_peek().value().token_type == TokenType::NUMBER ) {
        auto num = token_peek().value();
        consume(num.token_type);
        auto root = std::make_unique<NumberNode>(std::stod(num.lexeme));

        return root;

    } else if ( token_peek().value().token_type == TokenType::IDENTIFIER ) {
        auto identifier = token_peek().value();
        consume(identifier.token_type);
        auto root = std::make_unique<IdentifierNode>(identifier.lexeme);

        return root; 
        
    } else if ( token_peek().value().token_type == TokenType::L_PARENS ) {
        consume(TokenType::L_PARENS);
        auto root = expression();
        consume(TokenType::R_PARENS);

        return root; 
    
    } else {
        std::ostringstream oss;
        oss << "Unexpected token in Primary";    
        throw std::runtime_error(oss.str());

    }  
}