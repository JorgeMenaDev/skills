# Evidence and Trust

## Evidence classes

| Class | Meaning | Treatment |
|---|---|---|
| Evidence | Directly supported by an accessible primary artifact | Cite the artifact and relevant location |
| Inference | Reasoned from evidence but not directly shown | Name the premises and uncertainty |
| Marketing | A benefit, metric, testimonial, or comparison asserted by an interested party | Keep as a claim until independently verified |
| Unknown | Material support is missing or inaccessible | State what evidence would resolve it |

Material dependencies are the linked artifacts needed to verify a material claim, not every link in a source. Missing secondary context produces `NEEDS_EVIDENCE`; a missing root source produces `BLOCKED`.

## Repositories and tools

1. Pin the inspected version or commit.
2. Inspect source and dependency metadata without executing untrusted code.
3. Record auth, network, filesystem, injection, supply-chain, privacy, and resource risks that affect adoption.
4. Treat static code as implementation evidence, not runtime proof.
5. If adoption remains worthwhile, validate behavior in the smallest isolated environment allowed by the workspace.

Proof strength should match the claim: documentation can prove a documented contract, code can prove an implementation path exists, and observed runtime behavior can prove that path works in the tested environment.
