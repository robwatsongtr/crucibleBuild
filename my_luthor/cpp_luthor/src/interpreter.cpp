#include "interpreter.h"
#include "nodes.h"
#include <stdexcept>
#include <iostream>
#include <string>
#include <variant>
#include <stdexcept>


Interpreter::Interpreter() {}

const std::unordered_map< TokenType, 
    std::function<std::variant<double, bool>(double, double)>> 
    Interpreter::binary_op_map = {
        { TokenType::PLUS, 
            [](double a, double b) { return std::variant<double, bool>{a + b}; 
        }},
        { TokenType::MINUS, 
            [](double a, double b) { return std::variant<double, bool>{a - b}; 
        }},
        { TokenType::MULTIPLY, 
            [](double a, double b) { return std::variant<double, bool>{a * b}; 
        }},
        { TokenType::DIVIDE, 
            [](double a, double b) { return std::variant<double, bool>{a / b}; 
        }},
        { TokenType::LESS_THAN, 
            [](double a, double b) { return std::variant<double, bool>{a < b}; 
        }},
        { TokenType::GREATER_THAN, 
            [](double a, double b) { return std::variant<double, bool>{a > b}; 
        }},
        { TokenType::LESS_THAN_EQUAL, 
            [](double a, double b) { return std::variant<double, bool>{a <= b}; 
        }},
        { TokenType::GREATER_THAN_EQUAL, 
            [](double a, double b) { return std::variant<double, bool>{a >= b}; 
        }},
        { TokenType::EQUAL_TO, 
            [](double a, double b) { return std::variant<double, bool>{a == b}; 
        }},
        { TokenType::NOT_EQUAL, 
            [](double a, double b) { return std::variant<double, bool>{a != b}; 
        }},
    };

const std::unordered_map<
    TokenType, std::function<std::variant<double, bool>(double)>> 
    Interpreter::unary_op_map = {
        { TokenType::MINUS, 
            [](double a) { return std::variant<double, bool>{ -a }; 
        }}
    };

// need this in case a number ends up as a condition 
bool Interpreter::to_bool(const std::variant<double, bool>& comp) const {
    if (auto* d = std::get_if<double>(&comp)) {    
        return *d != 0.0; // returns true for any non zero, or false        
    } else if (auto* b = std::get_if<bool>(&comp)) {  
        return *b;                                                                                                                                                               
    }   
    return false;      
}

// Entry point ------------------------------

void Interpreter::evaluate(ASTNode& node) {
    node.accept(*this);
}


// Evauluators ------------------------------

void Interpreter::visit(NumberNode& node) {
    result = node.number;
}

void Interpreter::visit(IdentifierNode& node) {
    if ( auto it = symbol_table.find(node.identifier); 
        it != symbol_table.end()) 
    {
        result = it->second; 
    } else {
        throw std::runtime_error("ERROR: Identifier " 
            + node.identifier + " does not exist. ");
    }
}   

void Interpreter::visit(BinaryOpNode& node) {
    evaluate(*node.left);
    auto left = result;

    evaluate(*node.right);
    auto right = result;

    // The map lookup returns a callable, and the () right after invokes it.    
    // need .at() because map is const
    result = binary_op_map.at(node.op_type.token_type)(                                                                                                                                                         
      std::get<double>(left), std::get<double>(right)                                                                                                                                                         
    );  
}

void Interpreter::visit(UnaryOpNode& node) {
    evaluate(*node.operand);
    auto operand = result;

    result = unary_op_map.at(node.op_type.token_type)(
        std::get<double>(operand)
    );
}

void Interpreter::visit(AssignNode& node) {
    auto v_name = node.var_name;
    evaluate(*node.expression);
    auto expr = result; 

    symbol_table[v_name] = expr; 
}

void Interpreter::visit(PrintNode& node) {
    evaluate(*node.expression);
    auto expr_eval = result; 

    if (auto* d = std::get_if<double>(&expr_eval)) {    
        std::cout << "> " << *d << "\n";        
    } else if (auto* b = std::get_if<bool>(&expr_eval)) {  
        std::cout << "> " << (*b ? "True" : "False") << "\n";                                                                                                                                                                      
    }        
}

void Interpreter::visit(BlockNode& node) {
    for (const auto& stmt : node.statements) {
        evaluate(*stmt);
    }
}

void Interpreter::visit(WhileNode& node) {
    evaluate(*node.condition);
    auto cond = to_bool(result);

    while (cond) {
        evaluate(*node.body_block);
        // re-evaluate the starting conditon on each iteration 
        evaluate(*node.condition);
        cond = to_bool(result);
    }
}

void Interpreter::visit(ConditionalNode& node) {
    evaluate(*node.condition);
    auto cond = to_bool(result);

    if (cond) {
        evaluate(*node.then_block);
    } else {
        if (node.else_block) {
            evaluate(*node.else_block);
        }
    }
}

void Interpreter::visit(ProgramNode&) {
    throw std::runtime_error("ProgramNode should not be visited directly");
}