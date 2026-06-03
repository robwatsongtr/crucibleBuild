#include "runner.h"

Runner::Runner(std::unique_ptr<ProgramNode> program) 
    : program(std::move(program)) {}

void Runner::run(Visitor& v) {
    for (const auto& stmt : program->statements) {
        stmt->accept(v); 
    }
}