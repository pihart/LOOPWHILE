#!/usr/bin/env python3

"""
this is a LOOP/WHILE interpreter, written for PROMYS 2020
the base implementation is on https://repl.it/@cjquines/LOOPWHILE

please edit this! i know it's long, but i tried to make it simple to read,
edit, and extend.

let me (CJ) know if there's a change you want to make but couldn't figure out
how to write. (hint: if you spend more than 15 minutes making a change, then
you should ask for help!)

07-01: fixed LOOP 0
"""


class ParseError(Exception):
    # raised when the program can't be parsed
    def __init__(self, line, message):
        self.line = line
        self.message = message

    def __str__(self):
        return f"in line {self.line + 1}: {self.message}"


class RuntimeError(Exception):
    # raised when the program has a mistake during runtime
    pass


def is_valid_name(name):
    # is it a valid register name?
    return name.isupper() and name.isalpha()


def split_but_return(string, sep):
    # split the string by sep, but insert it in between instances
    result = []
    parts = string.split(sep)
    tail = parts.pop()
    for part in parts:
        if part:
            result.append(part)
        result.append(sep)
    if tail:
        result.append(tail)
    return result


class Instruction:
    """
    a line in the program, like X = Y, LOOP X, or WHILE X != 0.

    if you want to add a new instruction, you need to write three things.
        1. edit the run function here. this runs the instruction.
        2. edit the __init__ function here. this takes the input from the
           parser and stores it as variables, like self.X.
        3. edit the Parser's parse function. this should read the line, detect
           if it's of the given instruction, and then call __init__.

    see the existing instructions for examples.
    """

    def __init__(self, *args):
        # input from the parser, and set up the variables for this instruction.
        raise Exception("Instruction not implemented!")

    def run(self, registers, index):
        # does the instruction, which is at the given index.
        # change the registers in place. return index of the next line to run.
        raise Exception("Instruction not implemented!")


class Equate(Instruction):
    # X = Y
    def __init__(self, X, Y):
        self.X = X
        self.Y = Y

    def run(self, registers, index):
        registers[self.X] = registers[self.Y]
        return index + 1


class Addition(Instruction):
    # X += Y
    def __init__(self, X, Y):
        self.X = X
        self.Y = Y

    def run(self, registers, index):
        registers[self.X] = registers[self.X] + registers[self.Y]
        return index + 1


class Add(Instruction):
    # X = X + 1
    # X++
    def __init__(self, X):
        self.X = X

    def run(self, registers, index):
        registers[self.X] = registers[self.X] + 1
        return index + 1


class Set(Instruction):
    # X = 0
    def __init__(self, X):
        self.X = X

    def run(self, registers, index):
        registers[self.X] = 0
        return index + 1


class Loop(Instruction):
    # LOOP X
    def __init__(self, X):
        self.X = X
        self.loops_left = None

    def set_end_index(self, end_index):
        # we need this because we don't know the end index the first time we
        # read the LOOP instruction.
        self.end_index = end_index

    def run(self, registers, index):
        # the first time we run LOOP X
        if self.loops_left is None:
            self.loops_left = registers[self.X]

        # looping
        if self.loops_left > 0:
            self.loops_left = self.loops_left - 1
            return index + 1

        # done looping
        else:
            self.loops_left = None # reset
            return self.end_index


class While(Instruction):
    # WHILE X != 0
    def __init__(self, X):
        self.X = X

    def set_end_index(self, end_index):
        # see the comment for LOOP's set_end_index.
        self.end_index = end_index

    def run(self, registers, index):
        if registers[self.X] != 0:
            return index + 1
        else:
            return self.end_index


class End(Instruction):
    # END
    def __init__(self):
        pass

    def set_start_index(self, start_index):
        # see the comment for LOOP's set_end_index.
        self.start_index = start_index

    def run(self, registers, index):
        return self.start_index


class LineParser:
    """
    the line parser. converts a line into an instruction, and returns any
    registers seen.

    if you want to add a new instruction, you need to edit the parse_line
    function here to make that new instruction. you might also have to edit
    the parse function in Parser, if it depends on other lines.
    """

    def __init__(self, index, line):
        self.index = index
        self.line = line
        self.tokens = []
        self.tokenize_line()

    def tokenize_line(self):
        self.line = self.line.split("//")[0]
        # splits the line by whitespace, =, and +.
        for partial in self.line.split():
            for partial2 in split_but_return(partial, "="):
                for token in split_but_return(partial2, "+"):
                    self.tokens.append(token)

    def expect_length(self, length):
        if not len(self.tokens) == length:
            raise ParseError(self.index, "extra characters after instruction")

    def expect_name(self, name):
        if not is_valid_name(name):
            raise ParseError(self.index, f"{name} not a valid register name")

    def expect_token(self, token, expected):
        if token != expected:
            raise ParseError(self.index, f"expected {expected}, got {token}")

    def parse_line(self):
        # END
        if self.tokens[0] == "END":
            self.expect_length(1)
            return End(), set()
        # LOOP X
        elif self.tokens[0] == "LOOP":
            X = self.tokens[1]
            self.expect_name(X)
            self.expect_length(2)
            return Loop(X), {X}
        # X = 0
        elif len(self.tokens) >= 3 and self.tokens[1] == "=" and self.tokens[2] == "0":
            X = self.tokens[0]
            self.expect_name(X)
            self.expect_length(3)
            return Set(X), {X}
        # X = X + 1
        elif len(self.tokens) >= 5 and self.tokens[1] == "=" and self.tokens[3] == "+":
            X, X_, o = self.tokens[0], self.tokens[2], self.tokens[4]
            self.expect_name(X)
            self.expect_name(X_)
            self.expect_token(X_, X)
            self.expect_token(o, "1")
            self.expect_length(5)
            return Add(X), {X}
        # X = Y
        elif len(self.tokens) >= 3 and self.tokens[1] == "=":
            X, Y = self.tokens[0], self.tokens[2]
            self.expect_name(X)
            self.expect_name(Y)
            self.expect_length(3)
            return Equate(X, Y), {X, Y}
        # WHILE X != 0
        elif len(self.tokens) >= 5 and self.tokens[0] == "WHILE":
            X, n, e, z = self.tokens[1], self.tokens[2], self.tokens[3], self.tokens[4]
            self.expect_name(X)
            self.expect_token(n, "!")
            self.expect_token(e, "=")
            self.expect_token(z, "0")
            self.expect_length(5)
            return While(X), {X}
        else:
            raise ParseError(self.index, "don't know what instruction this is")


class Parser:
    """
    the parser. converts the program to a list of instructions.

    if you want to add a complicated instruction, you might also have to edit
    the parse function here.
    """

    def __init__(self, program):
        self.lines = []
        for line in program.splitlines():
            stripped = line.strip()
            if stripped:
                self.lines.append(stripped)

    def parse(self):
        instructions = []
        seen_registers = set()
        # indices of LOOP/WHILEs that are unmatched:
        unmatched_indices = []

        for index in range(len(self.lines)):
            line = self.lines[index]
            line_parser = LineParser(index, line)
            instruction, registers = line_parser.parse_line()

            # handle LOOP, WHILE, END:
            if isinstance(instruction, Loop) or isinstance(instruction, While):
                unmatched_indices.append(index)
            elif isinstance(instruction, End):
                start_index = unmatched_indices.pop()
                # the start index of END is start_index
                instruction.set_start_index(start_index)
                # the end index of this LOOP or WHILE is the index AFTER the
                # the current index. (it's the index it goes to after the loop)
                instructions[start_index].set_end_index(index + 1)

            instructions.append(instruction)
            seen_registers = seen_registers | registers

        return instructions, seen_registers


class Program:
    """
    runs the program itself.
    """

    def __init__(self, program):
        parser = Parser(program)
        self.lines, self.seen_registers = parser.parse()

    def check_inputs(self, inputs):
        for name, value in inputs.items():
            if not is_valid_name(name):
                raise RuntimeError(f"input {name} not a valid register name")
            if not isinstance(value, int) or value < 0:
                raise RuntimeError(f"input {name}'s {value} is not in N")

    def check_output(self, output):
        if not is_valid_name(output):
            raise RuntimeError(f"input {name} not a valid register")

    def run(self, inputs, output):
        self.check_inputs(inputs)
        self.check_output(output)

        # initialize registers
        registers = {}
        for name in self.seen_registers:
            registers[name] = 0
        for name, value in inputs.items():
            registers[name] = value

        # program loop
        index = 0
        while index != len(self.lines):
            instruction = self.lines[index]
            index = instruction.run(registers, index)

        return registers