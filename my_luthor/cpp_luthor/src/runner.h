#pragma once 
#include "nodes.h"

// Runner owns the ProgramNode via unique_ptr, takes ownership through the constructor 
// with std::move, and run() loops calling accept() on each statement

// Runner's job is tree traversal — own 
// the ProgramNode, iterate its statements, drive accept() calls.

class Runner {
public:
    Runner(std::unique_ptr<ProgramNode> program);

    void run(Visitor&);
private:
    std::unique_ptr<ProgramNode> program;

};