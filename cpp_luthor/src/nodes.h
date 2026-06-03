#pragma once
#include "tokens.h"

#include <memory>
#include <vector>
#include <string>

struct Visitor;

struct ASTNode {
    virtual ~ASTNode() = default;
    virtual std::string toString() const = 0;
    virtual void accept(Visitor& v) = 0;
};


struct UnaryOpNode : public ASTNode {
    Token op_type;
    std::unique_ptr<ASTNode> operand;

    UnaryOpNode(const Token& op_type, std::unique_ptr<ASTNode> operand)
        : op_type(op_type), operand(std::move(operand)) {}

    std::string toString() const override {
        return "Unary(" + op_type.lexeme + ", " + operand->toString() + ")";
    }

    void accept(Visitor& v) override;
};


struct BinaryOpNode : public ASTNode {
    Token op_type;
    std::unique_ptr<ASTNode> left;
    std::unique_ptr<ASTNode> right;

    BinaryOpNode(const Token& op_type, std::unique_ptr<ASTNode> left,
          std::unique_ptr<ASTNode> right)
        : op_type(op_type), left(std::move(left)), right(std::move(right)) {}

    std::string toString() const override {
        return "BinaryOp(" + op_type.lexeme + ", "
                           + left->toString() + ", "
                           + right->toString() + ")";
    }

    void accept(Visitor& v) override;
};

struct NumberNode : public ASTNode {
    double number;

    NumberNode(double number) : number(number) {}

    std::string toString() const override {
        return "Number(" + std::to_string(number) + ")";
    }

    void accept(Visitor& v) override;
};


struct IdentifierNode : public ASTNode {
    std::string identifier;

    IdentifierNode(const std::string& identifier) : identifier(identifier) {}

    std::string toString() const override {
        return "Identifier(" + identifier + ")";
    }

    void accept(Visitor& v) override;
};


struct AssignNode : public ASTNode {
    std::string var_name;
    std::unique_ptr<ASTNode> expression;

    AssignNode(const std::string& var_name, std::unique_ptr<ASTNode> expression)
        : var_name(var_name), expression(std::move(expression)) {}

    std::string toString() const override {
        return "Assign(" + var_name + ", " +  expression->toString() + ")";
    }

    void accept(Visitor& v) override;
};


struct BlockNode: public ASTNode {
    std::vector<std::unique_ptr<ASTNode>> statements;

    BlockNode(std::vector<std::unique_ptr<ASTNode>> statements)
        : statements(std::move(statements)) {}

    std::string toString() const override {
        std::string statement;
        for (const auto& ptr : statements) {
            statement += ptr->toString();
        }
        return "Block(" + statement + ")";
    }

    void accept(Visitor& v) override;
};


struct ConditionalNode: public ASTNode {
    std::unique_ptr<ASTNode> condition;
    std::unique_ptr<ASTNode> then_block;
    std::unique_ptr<ASTNode> else_block;

    ConditionalNode(std::unique_ptr<ASTNode> condition,
                    std::unique_ptr<ASTNode> then_block,
                    std::unique_ptr<ASTNode> else_block)
        : condition(std::move(condition)),
          then_block(std::move(then_block)),
          else_block(std::move(else_block)) {}

    std::string toString() const override {
        return "Conditional(" + condition->toString() + ","
                + then_block->toString() + ","
                + (else_block ? else_block->toString() : "None ") + ")";
    }

    void accept(Visitor& v) override;
};


struct WhileNode: public ASTNode {
    std::unique_ptr<ASTNode> condition;
    std::unique_ptr<ASTNode> body_block;

    WhileNode(std::unique_ptr<ASTNode> condition,
              std::unique_ptr<ASTNode> body_block )
        : condition(std::move(condition)),
          body_block(std::move(body_block)) {}

    std::string toString() const override {
        return "While(" + condition->toString() + ","
                        + body_block->toString() + ")";
    }

    void accept(Visitor& v) override;
};


struct PrintNode: public ASTNode {
    std::unique_ptr<ASTNode> expression;

    PrintNode(std::unique_ptr<ASTNode> expression)
        : expression(std::move(expression)) {}

    std::string toString() const override {
        return "Print(" + expression->toString() + ")";
    }

    void accept(Visitor& v) override;
};


struct ProgramNode: public ASTNode {
    std::vector<std::unique_ptr<ASTNode>> statements;

    ProgramNode(std::vector<std::unique_ptr<ASTNode>> statements)
        : statements(std::move(statements)) {}

    std::string toString() const override {
        std::string statement;
        for (const auto& ptr : statements) {
            statement += ptr->toString();
        }
        return "Program(" + statement + ")";
    }

    void accept(Visitor& v) override;
};


struct Visitor {
    virtual void visit(UnaryOpNode& node) = 0;
    virtual void visit(BinaryOpNode& node) = 0;
    virtual void visit(NumberNode& node) = 0;
    virtual void visit(IdentifierNode& node) = 0;
    virtual void visit(AssignNode& node) = 0;
    virtual void visit(BlockNode& node) = 0;
    virtual void visit(ConditionalNode& node) = 0;
    virtual void visit(WhileNode& node) = 0;
    virtual void visit(PrintNode& node) = 0;
    virtual void visit(ProgramNode& node) = 0;

    virtual ~Visitor() = default;
};


// accept definitions — after Visitor is fully defined
inline void UnaryOpNode::accept(Visitor& v)     { v.visit(*this); }
inline void BinaryOpNode::accept(Visitor& v)    { v.visit(*this); }
inline void NumberNode::accept(Visitor& v)      { v.visit(*this); }
inline void IdentifierNode::accept(Visitor& v)  { v.visit(*this); }
inline void AssignNode::accept(Visitor& v)      { v.visit(*this); }
inline void BlockNode::accept(Visitor& v)       { v.visit(*this); }
inline void ConditionalNode::accept(Visitor& v) { v.visit(*this); }
inline void WhileNode::accept(Visitor& v)       { v.visit(*this); }
inline void PrintNode::accept(Visitor& v)       { v.visit(*this); }
inline void ProgramNode::accept(Visitor& v)     { v.visit(*this); }
