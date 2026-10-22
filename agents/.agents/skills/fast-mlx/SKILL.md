---
name: fast-mlx
description: Optimize MLX code for performance and memory. Use when asked to implement or speed up MLX models or algorithms, reduce latency/throughput bottlenecks, tune lazy evaluation, type promotion, fast ops, compilation, memory use, or profiling.
---

# Fast MLX

## Workflow

- Looks for opportunities to compile functions of mostly elementwise operations.
- For models with fixed shape inputs or where the shapes don't change much, compile the entire graph
- Replace slow implementations with MLX fast ops
- Identify evaluation boundaries and unintended sync points (`mx.eval`, `item()`, NumPy conversions).
- Check dtype promotion and scalar usage; keep precision consistent with intent.
- Review compilation strategy; avoid unnecessary recompiles and closure captures.
- Reduce peak memory via lazy loading order and releasing temporaries before `mx.eval`.
- Suggest profiling steps if the bottleneck is unclear.

## References

- Read `references/fast-mlx-guide.md` for detailed tips and examples. Use it as the source of truth.

## Output expectations

- Provide concrete code changes with brief rationale
- Call out changes that need user confirmation (e.g., enabling async eval or shapeless compile).
