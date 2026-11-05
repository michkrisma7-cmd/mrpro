-- Add the transaction choice without rewriting existing listing values or custom options.
UPDATE "PropertyField"
SET "options" = array_append("options", 'Over Kredit')
WHERE "key" = 'transaksi'
  AND "type" = 'SELECT'
  AND NOT ('Over Kredit' = ANY("options"));
