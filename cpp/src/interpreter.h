#pragma once
#include "nodes.h"

#include <variant>
#include <unordered_map> 
#include <functional>

class Interpreter: public Visitor {
public:
    Interpreter();

private:
    std::variant<double, bool> result; 

    std::unordered_map<
        std::string, std::variant<double, bool>> symbol_table;  

    static const std::unordered_map< 
        TokenType, 
        std::function<
            std::variant<double, bool>(double, double)>> binary_op_map;

    static const std::unordered_map< 
        TokenType, 
        std::function<
            std::variant<double, bool>(double)>> unary_op_map;
    

    void evaluate(ASTNode&); 

    void visit(UnaryOpNode&);
    void visit(BinaryOpNode&);
    void visit(NumberNode&);
    void visit(IdentifierNode&);
    void visit(AssignNode&);
    void visit(BlockNode&);
    void visit(ConditionalNode&);
    void visit(WhileNode&);
    void visit(PrintNode&);
    void visit(ProgramNode&);
    
};