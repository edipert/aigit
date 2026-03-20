## 2024-03-20 - Time Travel Enrichment Reverted
**Learning:** In V8/Node, trying to manually map an array inside a loop (with type casting) instead of just using the spread operator and a subsequent `new Map(arr.map(...))` was demonstrably slower in benchmark runs (203ms vs 187ms baseline). The overhead of multiple `push` and `set` calls in a single loop exceeded the overhead of array copies for small data sets.
**Action:** When mapping arrays into `Map` structures, prefer bulk Map constructors over manual loops unless the array is excessively large or there are secondary operations. Always trust the benchmark over theoretical O(n) vs O(2n) optimizations when constant factors dominate.

## 2024-03-20 - Batch Operations O(N*M)
**Learning:** Filtering a large array of relations (decisions) inside a loop of entities (tasks) caused severe performance degradation ($O(N \times M)$) during merge operations.
**Action:** Always pre-group one-to-many relationships into a Map before iterating over the parent entities. This reduces complexity to $O(N+M)$ and provides massive speedups (2050ms -> 365ms in benchmarks).
