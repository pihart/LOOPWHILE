from loopwhile import Program

# IF X > 0
# is the same as
# LOOP 1 - (1 - X)

# D = 0
# G = 1
# LOOP X
#    D ++
#    Calculate X mod D idempotently
#    LOOP 1-R //if R=0
#       G = D


program = """
A = X
JSA = 0
LOOP Y
Y = JSA
JSA = JSA + 1
END
JS = 0
LOOP A
LOOP Y
JSAAA = 0
LOOP A
A = JSAAA
JSAAA = JSAAA + 1
END
END
LOOP A
JS = JS + 1
END
JSAA = 0
LOOP A
A = JSAA
JSAA = JSAA + 1
END
LOOP A
JSAAAA = 0
LOOP JS
JS = JSAAAA
JSAAAA = JSAAAA + 1
END
END
END
A = JS
"""

inputs = {
    "X": 41,
    "Y": 2,
}

output = "A"

prog = Program(program)

out = prog.run(inputs, output)
print(out)
print(out[output])
