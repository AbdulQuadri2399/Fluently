# Invented toolkit fixtures (NFR9)

Everything here is made up for tests and demos. The real Behavioural Design Toolkit is
company IP and must never be committed (`scripts/check-toolkit-fixture.sh` checks this).

- `sample-toolkit.csv` / `.json`: 30 invented principles using the real column names plus
  the new `ID` column. Includes "No source" evidence, both Sense columns, related principles
  (one, `P999`, doesn't exist), and an extra `Notes` column (CSV only) to test the warning.
- `bad-missing-id.csv`: row 4 has an empty ID.
- `bad-duplicate-id.csv`: rows 3 and 6 share an ID.
- `bad-missing-columns.csv`: no `Sub-Goal` or `Mechanism` column.

- `sheet-layout.csv`: invented data in the same layout as the team's working sheet (no ID column, repeated principle names, two spellings of one goal, a thin row, an unnamed row, extra tidy-up columns). Used to test that such a sheet loads (AC33.5). It is not the real toolkit.
