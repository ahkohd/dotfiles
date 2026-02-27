# Making MLX Go Fast

## Table of Contents

- [Graph Evaluation](#graph-evaluation)
- [Type Promotion](#type-promotion)
- [Operations](#operations)
- [Compile](#compile)
- [Memory Use](#memory-use)
- [Profiling](#profiling)

This guide assumes you have some familiarity with MLX and want to make your MLX
model or algorithm as efficient as possible.

### Graph Evaluation

Recall, MLX is lazy. When you call an MLX op, no computation actually happens.
You are simply building a graph. The computation happens when you explicitly or
implicitly evaluate an array. Read more about how this works in the
documentation:
https://ml-explore.github.io/mlx/build/html/usage/lazy_evaluation.html

Evaluating the graph incurs some overhead, so don't do it too frequently.
Conversely you don't want the graph to get too big before evaluating it as this
can also be expensive. Most numerical and machine learning algorithms are
iterative. A good place to evaluate the graph is at the end of each iteration.
Some examples:

- After an iteration of gradient descent
- After producing one token with a language model
- After taking one denoising step in a diffusion model

Overly frequent evaluations sometimes happen by accident. For example:

```python
# output is an mx.array
for x in output:
  do_something(x.item())
```

The same thing can be written more explicitly with operations and `mx.eval` as:

```python
for i in range(len(output)):
  x = output[i]
  mx.eval(x)
  do_something(x.item())
```

Two better options are:

1. When possible avoid calling `item()` and do everything in MLX.
2. Move the entire output to Python or NumPy first.

An example of the second approach:

```python
for x in output.tolist():
  do_something(x)
```

#### Asynchronous Evaluation

For a latency sensitive computation which is run many times, `mx.async_eval`
can be useful. Normally `mx.eval` is synchronous. It returns only when the
computation is complete. Instead `mx.async_eval` asynchronously evaluates the
graph and returns to the main thread immediately. You can use this to pipeline
graph construction with computation like so:

```python
def generator():
    out = mx.async_eval(my_function())

    while True:
        out_next = mx.async_eval(my_function())
        mx.eval(out)
        yield out
        out = out_next
```

For this to work `my_function()` cannot do any synchronous evaluations (e.g.
calling `mx.eval`, converting to NumPy, etc.). Furthermore, any work done on
`out` that is synchronous and on the same stream can stall the pipeline:

```python
for out in generator():
    out = out * 2
    # Stalls the pipeline!
    mx.eval(out)
```

An easy fix for this is to put the pipeline in a separate stream:

```python
def generator():
    with mx.stream(mx.new_stream(mx.gpu)):
        out = mx.async_eval(my_function())

        while True:
            out_next = mx.async_eval(my_function())
            mx.eval(out)
            yield out
            out = out_next
```

### Type Promotion

One of the most common performance issues comes from accidental up-casting.
Make sure you understand how type promotion works in MLX. The inputs to an MLX
operation are typically promoted to a common type which doesn't lose precision.
For example:

```python
x = mx.array(1.0, mx.float32) * mx.array(2.0, mx.float16)
```

will result in `x` with type `mx.float32`. Similarly:

```python
x = mx.array(1.0, mx.bfloat16) * mx.array(2.0, mx.float16)
```

will result in `x` with type `mx.float32`. A common mistake is to multiply a
half-precision array by a default-typed scalar array which up-casts everything
to `mx.float32`:

```python
# Warning: x has type mx.float32
x = my_fp16_array * mx.array(2.0)
```

To multiply by a scalar while preserving the input type, use Python scalars.
Python scalars are weakly typed and have more relaxed promotion rules when
used with MLX arrays.

```python
# Ok, x has type mx.float16
x = my_fp16_array * 2.0
```

### Operations

#### Use Fast Ops

Use `mx.fast` ops when possible:

- `mx.fast.rms_norm`
- `mx.fast.layer_norm`
- `mx.fast.rope`
- `mx.fast.scaled_dot_product_attention`

A lot of these operations take a variety of parameters so they can be used for
different variations of the function. For example, the weight and bias
parameters are optional in `mx.fast.layer_norm` so it can be used with
different permutations of inputs.

#### Precision

For operations which typically use higher precision there is usually no
need to explicitly upcast. For example, `mx.fast.rms_norm` and
`mx.fast.layer_norm` accumulate in higher precision so it's
wasteful to upcast and downcast into and out of these operations:

```python
# No need for this!
mx.fast.rms_norm(x.astype(mx.float32), w, b, eps).astype(x.dtype)

# This is just as good:
mx.fast.rms_norm(x, w, b, eps)
```

Similarly, for `mx.softmax` use `precise=True` if you want to do the softmax in
higher precision rather than explicitly casting the input and output.

#### Misc

- For vector-matrix multiplication `x @ W.T` is faster than `x @ W`, for
  matrix-vector multiplication `W @ x` is faster than `W.T @ x`
- Use `mx.addmm` for `a @ b + c` (e.g. a linear layer with a bias).
- Where it makes sense, use `mx.take_along_axis` and `mx.put_along_axis`
  instead of fancy indexing
- Use broadcasting instead of concatenation. For example, prefer `mx.repeat(a,
  n)` over `mx.concatenate([a] * n)`

### Compile

Compiling graphs with `mx.compile` can make them run a lot faster. But there
are some sharp-edges that are good to be aware of.

First, be aware of when a function will be recompiled. Recompilation is
relatively expensive and should only be done if there is sufficient work over
which to amortize the cost.

The default behavior of `mx.compile` is to do a shape-dependent compilation.
This means the function will be recompiled if the shape of any input changes.

MLX supports a shapeless compilation by passing `shapeless=True` to
`mx.compile`. It's easy to make hard-to-detect mistakes with shapeless
compilation. Make sure to read and understand the documentation and use it
with care:
https://ml-explore.github.io/mlx/build/html/usage/compile.html#shapeless-compilation

A function will also be recompiled if any constant inputs change:

```python
@mx.compile
def fun(x, scale):
  return scale * x

fun(x, 3)

# Recompiles!
fun(x, 4)
```

In this case a simple fix is to make `scale` an `mx.array`.

#### Compiling Closures

Be careful when compiling a closure where the function encloses any
`mx.array`.

```python
y = some_function()

@mx.compile
def fun(x):
  return x + y
```

Since `y` is not an input to `fun`, the compiled graph will include the entire
computation which produces `y`. Usually you only want to compute `y` one time
and re-use it in the compiled function. Either explicitly pass it as an input
to `fun` or pass it as an implicit input to `mx.compile` like so:

```python
y = some_function()

@partial(mx.compile, inputs=[y])
def fun(x):
  return x + y
```

### Memory Use

#### Lazy Loading

Loading arrays from a file is lazy in MLX:

```python
weights = mx.load("model.safetensors")
```

The above function returns instantly, regardless of the file size. To actually
load the weights into memory, you can do `mx.eval(weights)`.

Assume the weights are stored on disk in 32-bit precision (i.e. `mx.float32`).
But for your model you only need 16-bit precision:

```python
weights = mx.load("model.safetensors")
mx.eval(weights)
weights = {k: v.astype(mx.float16) for k, v in weights.items()}
```

In the above, the weights will be loaded into memory in full precision and then
cast to 16-bit. This requires memory for all the weights in 32-bit plus memory
for the weights in 16-bit.

This is much better:

```python
weights = mx.load("model.safetensors")
weights = {k: v.astype(mx.float16) for k, v in weights.items()}
mx.eval(weights)
```

Evaluating after the cast to `mx.float16` reduces peak memory by nearly a
third. That's because all the weights are never fully materialized in 32-bit.
Right after each weight is loaded in 32-bit precision it is cast to 16-bit.
The memory for the 32-bit weight can be reused when loading the next weight.

Note, MLX is only able to lazy load from a file when it is given to `mx.load`
as a string path. Due to lifetime management issues, lazy loading from file
handles is not supported. So avoid this:

```python
weights = mx.load(open("model.safetensors", 'rb'))
```

#### Release Temporaries

One way to reduce memory consumption is to avoid holding
temporaries you don't need. This is a typical training loop:

```python
for x, y in dataset:
    loss, grads = nn.value_and_grad(model, loss_fn)(model, x, y)
    optimizer.update(model, grads)
    mx.eval(model, optimizer.state)
```

It's suboptimal since a reference to `grads` is held during the call to
`mx.eval` which keeps the respective memory from being used for any other part
of the computation.

This is better:

```python
def step(x, y):
    loss, grads = nn.value_and_grad(model, loss_fn)(model, x, y)
    optimizer.update(model, grads)
    return loss

for x, y in dataset:
    loss = step(x, y)
    mx.eval(model, optimizer.state)
```

In this case the reference to `grads` is released before `mx.eval` and the
memory can be reused. You can achieve the same goal using `del` as long as it's
before the call to `mx.eval`:

```python
for x, y in dataset:
    loss, grads = nn.value_and_grad(model, loss_fn)(model, x, y)
    optimizer.update(model, grads)
    del grads
    mx.eval(model, optimizer.state)
```

#### Misc

- MLX will cache memory buffers of recently released arrays rather than
  returning them to the system. In some cases, especially for variable shape
  computations, the cache can get large. To help with this, MLX has some
  functions for logging and customizing the behavior of memory allocation:
  https://ml-explore.github.io/mlx/build/html/python/metal.html

### Profiling

A good first step is to check GPU utilization using, for example,
mactop: https://github.com/context-labs/mactop. If it's not pegged at close
to 100% then there is likely a non-MLX bottleneck somewhere in the program. A
common culprit is data loading or preprocessing.

If GPU utilization is good, a good next step is to figure out which operations
are taking up so much time. One way to do this is with the Metal debugger. For
that, see the documentation on profiling MLX with the Metal debugger:
https://ml-explore.github.io/mlx/build/html/dev/metal_debugger.html
