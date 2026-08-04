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