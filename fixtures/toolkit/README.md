# Invented toolkit fixtures (NFR9)

Everything here is made up for tests and demos. The real Behavioural Design Toolkit is
company IP and must never be committed (`scripts/check-toolkit-fixture.sh` checks this).

- `sample-toolkit.csv` / `.json`: 30 invented principles using the real column names plus
  the new `ID` column. Includes "No source" evidence, both Sense columns, related principles
  (one, `P999`, doesn't exist), and an extra `Notes` column (CSV only) to test the warning.
- `bad-missing-id.csv`: row 4 has an empty ID.
- `bad-duplicate-id.csv`: rows 3 and 6 share an ID.
- `bad-missing-columns.csv`: no `Sub-Goal` or `Mechanism` column.
